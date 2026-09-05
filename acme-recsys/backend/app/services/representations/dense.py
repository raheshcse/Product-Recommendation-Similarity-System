"""Dense word-embedding representations (Word2Vec and FastText).

Both models produce one vector per *word*; a product vector is the mean of the
vectors of its words.  The only behavioural difference is what happens to a word
that was never seen during training:

* Word2Vec has to skip it (no vector exists).
* FastText can still build one from character n-grams.

That single difference is captured by `handles_unseen_words` and by the
`_word_vector` hook, so the two classes share everything else.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.services.representations.base import BaseRepresentation, RepresentationInfo
from app.services.text_processing import clean_text, tokenize


class DenseEmbeddingRepresentation(BaseRepresentation):
    """Shared logic for mean-pooled word-embedding representations."""

    model_file: str = ""
    vectors_file: str = ""

    def __init__(self, artifacts_dir: Path) -> None:
        super().__init__(artifacts_dir)
        self.model = None
        self.vectors: np.ndarray | None = None
        self._unit_vectors: np.ndarray | None = None

    # ------------------------------------------------------------------
    def _load_model(self):  # pragma: no cover - overridden
        raise NotImplementedError

    def load(self) -> None:
        self.model = self._load_model()
        vectors = np.load(self.artifacts_dir / self.vectors_file).astype(np.float32)
        self.vectors = vectors
        self._unit_vectors = _l2_normalize(vectors)

    # ------------------------------------------------------------------
    @property
    def n_products(self) -> int:
        return 0 if self.vectors is None else int(self.vectors.shape[0])

    def _word_vector(self, word: str) -> np.ndarray | None:  # pragma: no cover
        raise NotImplementedError

    def embed(self, text: str) -> tuple[np.ndarray, list[str], list[str]]:
        """Return (mean vector, used tokens, out-of-vocabulary tokens)."""
        dim = int(self.model.vector_size)
        tokens = tokenize(text)

        used: list[str] = []
        oov: list[str] = []
        collected: list[np.ndarray] = []

        for token in tokens:
            vector = self._word_vector(token)
            if vector is None:
                oov.append(token)
            else:
                collected.append(vector)
                used.append(token)

        if not collected:
            return np.zeros(dim, dtype=np.float32), used, oov
        return np.mean(collected, axis=0).astype(np.float32), used, oov

    # ------------------------------------------------------------------
    def _cosine(self, query: np.ndarray) -> np.ndarray:
        assert self._unit_vectors is not None
        norm = float(np.linalg.norm(query))
        if norm == 0.0:
            return np.zeros(self._unit_vectors.shape[0], dtype=np.float32)
        return (self._unit_vectors @ (query / norm)).astype(np.float32)

    def score_by_index(self, index: int) -> np.ndarray:
        assert self.vectors is not None
        return self._cosine(self.vectors[index])

    def score_by_text(self, text: str) -> np.ndarray:
        vector, _, _ = self.embed(text)
        return self._cosine(vector)

    # ------------------------------------------------------------------
    def explain(self, text: str) -> dict[str, Any]:
        cleaned = clean_text(text)
        vector, used, oov = self.embed(cleaned)
        norm = float(np.linalg.norm(vector))

        if oov and self.handles_unseen_words:
            note = (
                f"{len(oov)} token(s) were outside the training vocabulary; "
                "FastText rebuilt them from character n-grams."
            )
        elif oov:
            note = f"{len(oov)} token(s) were skipped because Word2Vec has no vector for them."
        else:
            note = "Every token was found in the learned vocabulary."

        return {
            "cleaned_text": cleaned,
            "tokens": tokenize(cleaned),
            "tokens_used": used,
            "unknown_tokens": oov,
            "vector_dimensions": int(self.model.vector_size),
            "vector_norm": round(norm, 4),
            "vector_preview": [round(float(v), 4) for v in vector[:8]],
            "vector_is_empty": bool(norm == 0.0),
            "note": note,
        }

    def similar_words(self, word: str, top_n: int = 8) -> list[dict[str, float]]:
        """Nearest words in the embedding space - useful for the demo/dry run."""
        try:
            pairs = self.model.wv.most_similar(clean_text(word), topn=top_n)
        except Exception:  # noqa: BLE001 - word simply not representable
            return []
        return [{"word": str(w), "score": round(float(s), 4)} for w, s in pairs]

    # ------------------------------------------------------------------
    def info(self) -> RepresentationInfo:
        base = super().info()
        if self.loaded and self.vectors is not None:
            zero_rows = int(np.count_nonzero(~self.vectors.any(axis=1)))
            base.dimensions = int(self.vectors.shape[1])
            base.vocabulary_size = int(len(self.model.wv))
            base.extra = {
                "zero_vector_products": zero_rows,
                "window": int(getattr(self.model, "window", 0)),
                "min_count": int(getattr(self.model, "min_count", 0)),
                "architecture": "skip-gram" if getattr(self.model, "sg", 1) else "CBOW",
            }
        return base


class Word2VecRepresentation(DenseEmbeddingRepresentation):
    key = "word2vec"
    name = "Word2Vec"
    family = "dense-embedding"
    description = (
        "Skip-gram embeddings averaged per product. Captures meaning learned from "
        "how words co-occur, but a word missing from the vocabulary is simply dropped."
    )
    handles_unseen_words = False

    model_file = "acme_word2vec.model"
    vectors_file = "product_word2vec_vectors.npy"

    def _load_model(self):
        from gensim.models import Word2Vec

        return Word2Vec.load(str(self.artifacts_dir / self.model_file))

    def _word_vector(self, word: str) -> np.ndarray | None:
        if word in self.model.wv:
            return self.model.wv[word]
        return None


class FastTextRepresentation(DenseEmbeddingRepresentation):
    key = "fasttext"
    name = "FastText"
    family = "dense-embedding"
    description = (
        "Sub-word embeddings. Because every word is also represented by its character "
        "n-grams, brand-new product wording, typos and rare model numbers still get a "
        "sensible vector - the strongest option for generalisation."
    )
    handles_unseen_words = True

    model_file = "acme_fasttext.model"
    vectors_file = "product_fasttext_vectors.npy"

    def _load_model(self):
        from gensim.models import FastText

        return FastText.load(str(self.artifacts_dir / self.model_file))

    def _word_vector(self, word: str) -> np.ndarray | None:
        try:
            return self.model.wv[word]
        except KeyError:
            return None


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (matrix / norms).astype(np.float32)
