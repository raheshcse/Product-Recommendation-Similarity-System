"""Offline quality checks.

The catalogue has no human relevance labels, so we use the product taxonomy as a
proxy: a good recommendation for a query product should usually sit in the same
subcategory (and almost always in the same main category).  This gives three
standard, comparable numbers per representation:

* precision@k  - share of the top-k that match the query's subcategory
* category@k   - share of the top-k that match the query's main category
* MRR          - 1 / rank of the first subcategory match

These are proxies, not ground truth, and the API says so in `caveat`.
"""

from __future__ import annotations

import time
from typing import Any

import numpy as np

from app.core.logging import get_logger
from app.services.recommender import HYBRID_KEY, RecommendationEngine, _top_k

logger = get_logger(__name__)


class EvaluationService:
    def __init__(self, engine: RecommendationEngine) -> None:
        self.engine = engine
        self._cache: dict[tuple[int, int, int], dict[str, Any]] = {}

    def run(self, *, sample_size: int | None = None, k: int | None = None, seed: int = 42) -> dict[str, Any]:
        settings = self.engine.settings
        sample_size = min(sample_size or settings.evaluation_sample_size, self.engine.catalogue.size)
        k = k or settings.evaluation_k

        cache_key = (sample_size, k, seed)
        if cache_key in self._cache:
            return self._cache[cache_key]

        rng = np.random.default_rng(seed)
        sample = rng.choice(self.engine.catalogue.size, size=sample_size, replace=False)

        df = self.engine.catalogue.df
        main = df["Main Category"].to_numpy()
        sub = df["Subcategory"].to_numpy()

        models = [key for key in self.engine.available_keys()]
        summaries: list[dict[str, Any]] = []

        for key in models:
            started = time.perf_counter()
            precision, category, reciprocal, mean_scores = [], [], [], []

            for index in sample:
                scores = self.engine._scores(key, product_id=int(index), text=None)
                ranked, ranked_scores = _top_k(
                    scores, k=k, exclude=int(index), min_score=0.0, allowed=None
                )
                if ranked.size == 0:
                    continue

                sub_hits = sub[ranked] == sub[index]
                precision.append(float(sub_hits.mean()))
                category.append(float((main[ranked] == main[index]).mean()))
                mean_scores.append(float(np.mean(ranked_scores)))

                first = np.flatnonzero(sub_hits)
                reciprocal.append(1.0 / (int(first[0]) + 1) if first.size else 0.0)

            summaries.append(
                {
                    "model": key,
                    "model_name": self.engine._display_name(key),
                    "precision_at_k": round(float(np.mean(precision)), 4) if precision else 0.0,
                    "category_match_at_k": round(float(np.mean(category)), 4) if category else 0.0,
                    "mrr": round(float(np.mean(reciprocal)), 4) if reciprocal else 0.0,
                    "mean_top_k_score": round(float(np.mean(mean_scores)), 4) if mean_scores else 0.0,
                    "elapsed_ms": round((time.perf_counter() - started) * 1000, 1),
                }
            )

        summaries.sort(key=lambda row: row["precision_at_k"], reverse=True)

        payload = {
            "sample_size": sample_size,
            "k": k,
            "seed": seed,
            "metrics": summaries,
            "best_model": summaries[0]["model"] if summaries else None,
            "caveat": (
                "Subcategory agreement is a proxy for relevance, not human-labelled "
                "ground truth. It rewards taxonomically consistent recommendations and "
                "should be read alongside the qualitative side-by-side comparison."
            ),
            "definitions": {
                "precision_at_k": "Share of the top-k results in the query's subcategory.",
                "category_match_at_k": "Share of the top-k results in the query's main category.",
                "mrr": "Mean reciprocal rank of the first subcategory match.",
            },
        }

        self._cache[cache_key] = payload
        logger.info("Evaluation complete for %s models on %s queries", len(summaries), sample_size)
        return payload


__all__ = ["EvaluationService", "HYBRID_KEY"]
