"""Recommendation engine.

Owns the catalogue, every registered representation, and the ranking logic that
turns a similarity vector into an ordered list of products.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from app.core.config import Settings
from app.core.logging import get_logger
from app.services.catalogue import Catalogue
from app.services.representations.base import BaseRepresentation
from app.services.representations.dense import (
    FastTextRepresentation,
    Word2VecRepresentation,
)
from app.services.representations.tfidf import TfidfRepresentation
from app.services.text_processing import build_combined_text, clean_text

logger = get_logger(__name__)

HYBRID_KEY = "hybrid"


class RecommendationEngine:
    """Single object the API layer talks to."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.catalogue = Catalogue(settings.prepared_dataset_path)
        self.representations: dict[str, BaseRepresentation] = {}
        self.ready = False
        self.load_errors: dict[str, str] = {}

    # ------------------------------------------------------------------
    # Startup
    # ------------------------------------------------------------------
    def load(self) -> None:
        started = time.perf_counter()
        self.catalogue.load()

        artifacts: Path = self.settings.artifacts_dir
        candidates: list[BaseRepresentation] = [
            TfidfRepresentation(artifacts),
            Word2VecRepresentation(artifacts),
            FastTextRepresentation(artifacts),
        ]

        for representation in candidates:
            self.representations[representation.key] = representation
            if representation.safe_load():
                if representation.n_products != self.catalogue.size:
                    representation.loaded = False
                    representation.error = (
                        f"Vector count {representation.n_products} does not match "
                        f"catalogue size {self.catalogue.size}. Rebuild the artifacts."
                    )
            if not representation.loaded:
                self.load_errors[representation.key] = representation.error or "unknown error"
                logger.warning("%s unavailable - %s", representation.name, representation.error)
            else:
                logger.info("%s ready (%s products)", representation.name, representation.n_products)

        self.ready = any(r.loaded for r in self.representations.values())
        logger.info(
            "Engine loaded in %.2fs | available models: %s",
            time.perf_counter() - started,
            ", ".join(self.available_keys()) or "none",
        )

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    def available_keys(self) -> list[str]:
        keys = [k for k, r in self.representations.items() if r.loaded]
        if len(keys) >= 2:
            keys.append(HYBRID_KEY)
        return keys

    def model_catalogue(self) -> list[dict[str, Any]]:
        entries = [vars(r.info()) for r in self.representations.values()]
        if len([r for r in self.representations.values() if r.loaded]) >= 2:
            entries.append(
                {
                    "key": HYBRID_KEY,
                    "name": "Hybrid Ensemble",
                    "family": "ensemble",
                    "description": (
                        "Weighted blend of the available representations. TF-IDF supplies "
                        "exact-term precision while the dense models supply meaning, which "
                        "keeps results stable across both short and descriptive queries."
                    ),
                    "handles_unseen_words": True,
                    "loaded": True,
                    "n_products": self.catalogue.size,
                    "dimensions": 0,
                    "vocabulary_size": 0,
                    "extra": {"weights": self._active_hybrid_weights()},
                    "error": None,
                }
            )
        return entries

    def _resolve(self, key: str) -> BaseRepresentation:
        representation = self.representations.get(key)
        if representation is None:
            raise KeyError(f"Unknown model '{key}'")
        if not representation.loaded:
            raise RuntimeError(f"Model '{key}' is not available: {representation.error}")
        return representation

    def _active_hybrid_weights(self) -> dict[str, float]:
        weights = {
            key: value
            for key, value in self.settings.hybrid_weights.items()
            if self.representations.get(key) is not None and self.representations[key].loaded
        }
        total = sum(weights.values()) or 1.0
        return {key: round(value / total, 4) for key, value in weights.items()}

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    def _scores(self, key: str, *, product_id: int | None, text: str | None) -> np.ndarray:
        if key == HYBRID_KEY:
            weights = self._active_hybrid_weights()
            blended = np.zeros(self.catalogue.size, dtype=np.float32)
            for sub_key, weight in weights.items():
                blended += weight * _rescale(self._scores(sub_key, product_id=product_id, text=text))
            return blended

        representation = self._resolve(key)
        if product_id is not None:
            return representation.score_by_index(product_id)
        return representation.score_by_text(text or "")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def recommend(
        self,
        *,
        models: Iterable[str],
        product_id: int | None = None,
        query_text: str | None = None,
        top_n: int | None = None,
        min_score: float = 0.0,
        category_filter: str | None = None,
    ) -> dict[str, Any]:
        """Rank the catalogue for one query across one or more representations."""
        if product_id is None and not (query_text or "").strip():
            raise ValueError("Provide either a product_id or a non-empty query_text.")

        top_n = min(top_n or self.settings.default_top_n, self.settings.max_top_n)

        if product_id is not None:
            query_product = self.catalogue.get(product_id)
            query_text_effective = query_product["combined_text"]
        else:
            query_product = None
            query_text_effective = build_combined_text(query_text)

        allowed_rows = self._category_mask(category_filter)

        results: list[dict[str, Any]] = []
        for key in models:
            started = time.perf_counter()
            try:
                scores = self._scores(key, product_id=product_id, text=query_text_effective)
            except (KeyError, RuntimeError) as exc:
                results.append(
                    {
                        "model": key,
                        "model_name": self._display_name(key),
                        "available": False,
                        "error": str(exc),
                        "elapsed_ms": 0.0,
                        "recommendations": [],
                        "score_summary": None,
                    }
                )
                continue

            ranked_idx, ranked_scores = _top_k(
                scores,
                k=top_n,
                exclude=product_id,
                min_score=min_score,
                allowed=allowed_rows,
            )

            results.append(
                {
                    "model": key,
                    "model_name": self._display_name(key),
                    "available": True,
                    "error": None,
                    "elapsed_ms": round((time.perf_counter() - started) * 1000, 2),
                    "recommendations": self.catalogue.records(ranked_idx, ranked_scores),
                    "score_summary": {
                        "max": round(float(scores.max()), 6),
                        "mean": round(float(scores.mean()), 6),
                        "min": round(float(scores.min()), 6),
                        "std": round(float(scores.std()), 6),
                    },
                }
            )

        return {
            "query": {
                "mode": "catalogue" if product_id is not None else "free_text",
                "product": query_product,
                "raw_text": query_text,
                "processed_text": query_text_effective,
                "top_n": top_n,
                "min_score": min_score,
                "category_filter": category_filter,
            },
            "results": results,
            "agreement": _agreement(results),
        }

    # ------------------------------------------------------------------
    def explain(self, *, product_id: int | None, query_text: str | None) -> dict[str, Any]:
        """Stage-by-stage trace of how a query becomes a vector."""
        if product_id is not None:
            product = self.catalogue.get(product_id)
            raw = product["name"]
            processed = product["combined_text"]
        else:
            product = None
            raw = query_text or ""
            processed = build_combined_text(raw)

        stages = [
            {
                "stage": "1. Raw input",
                "detail": raw,
                "note": "Text exactly as it arrives from the catalogue or the user.",
            },
            {
                "stage": "2. Normalisation",
                "detail": clean_text(raw),
                "note": "Lowercased, punctuation stripped, whitespace collapsed.",
            },
            {
                "stage": "3. Field combination",
                "detail": processed,
                "note": "Name + Main Category + Subcategory joined into one document.",
            },
            {
                "stage": "4. Tokenisation",
                "detail": " | ".join(processed.split()),
                "note": "Whitespace tokens handed to each representation.",
            },
        ]

        per_model: dict[str, Any] = {}
        for key, representation in self.representations.items():
            if not representation.loaded:
                continue
            per_model[key] = {
                "model_name": representation.name,
                **representation.explain(processed),
            }

        return {
            "query": {"product": product, "raw_text": raw, "processed_text": processed},
            "pipeline": stages,
            "models": per_model,
        }

    # ------------------------------------------------------------------
    def neighbour_words(self, word: str, top_n: int = 8) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key in ("word2vec", "fasttext"):
            representation = self.representations.get(key)
            if representation is not None and representation.loaded:
                out[key] = representation.similar_words(word, top_n=top_n)  # type: ignore[attr-defined]
        return {"word": clean_text(word), "neighbours": out}

    # ------------------------------------------------------------------
    def _display_name(self, key: str) -> str:
        if key == HYBRID_KEY:
            return "Hybrid Ensemble"
        representation = self.representations.get(key)
        return representation.name if representation else key

    def _category_mask(self, category: str | None) -> np.ndarray | None:
        if not category:
            return None
        target = clean_text(category)
        mask = (self.catalogue.df["Main Category"] == target).to_numpy()
        return mask if mask.any() else None


# ----------------------------------------------------------------------
# Ranking helpers
# ----------------------------------------------------------------------
def _top_k(
    scores: np.ndarray,
    *,
    k: int,
    exclude: int | None,
    min_score: float,
    allowed: np.ndarray | None,
) -> tuple[np.ndarray, np.ndarray]:
    """Return the k highest-scoring indices (query itself removed)."""
    working = scores.astype(np.float32, copy=True)

    if allowed is not None:
        working[~allowed] = -np.inf
    if exclude is not None and 0 <= exclude < working.size:
        working[exclude] = -np.inf
    if min_score > 0:
        working[working < min_score] = -np.inf

    finite = int(np.isfinite(working).sum())
    if finite == 0:
        return np.array([], dtype=int), np.array([], dtype=np.float32)

    k = min(k, finite)
    # argpartition is O(n); a full sort of 50k+ scores on every request is waste.
    candidate_idx = np.argpartition(-working, k - 1)[:k]
    order = np.argsort(-working[candidate_idx])
    ranked = candidate_idx[order]
    return ranked, working[ranked]


def _rescale(scores: np.ndarray) -> np.ndarray:
    """Min-max scale so representations on different score ranges blend fairly."""
    lo = float(np.min(scores))
    hi = float(np.max(scores))
    if hi - lo < 1e-9:
        return np.zeros_like(scores, dtype=np.float32)
    return ((scores - lo) / (hi - lo)).astype(np.float32)


def _agreement(results: list[dict[str, Any]]) -> dict[str, Any]:
    """How much do the models agree on the top-N set?"""
    sets = {
        r["model"]: {item["product_id"] for item in r["recommendations"]}
        for r in results
        if r["available"] and r["recommendations"]
    }
    if len(sets) < 2:
        return {"overlap_pct": None, "shared_product_ids": [], "pairwise": []}

    shared = set.intersection(*sets.values())
    largest = max(len(s) for s in sets.values()) or 1

    pairwise = []
    keys = list(sets)
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = sets[keys[i]], sets[keys[j]]
            union = a | b
            pairwise.append(
                {
                    "pair": f"{keys[i]} vs {keys[j]}",
                    "jaccard": round(len(a & b) / len(union), 4) if union else 0.0,
                }
            )

    return {
        "overlap_pct": round(100 * len(shared) / largest, 1),
        "shared_product_ids": sorted(shared),
        "pairwise": pairwise,
    }
