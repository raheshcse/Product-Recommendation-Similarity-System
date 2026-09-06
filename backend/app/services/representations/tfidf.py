"""TF-IDF representation (lexical baseline)."""

from __future__ import annotations

from typing import Any

import joblib
import numpy as np
from scipy import sparse
from sklearn.preprocessing import normalize

from app.services.representations.base import BaseRepresentation, RepresentationInfo
from app.services.text_processing import clean_text, tokenize

VECTORIZER_FILE = "tfidf_vectorizer.joblib"
MATRIX_FILE = "tfidf_matrix.npz"


class TfidfRepresentation(BaseRepresentation):
    key = "tfidf"
    name = "TF-IDF"
    family = "lexical"
    description = (
        "Sparse term-weighting baseline. Precise on exact wording, but it has no "
        "notion of meaning: two products only match when they literally share tokens."
    )
    handles_unseen_words = False

    def __init__(self, artifacts_dir) -> None:
        super().__init__(artifacts_dir)
        self.vectorizer = None
        self.matrix: sparse.csr_matrix | None = None
        self._normalized: sparse.csr_matrix | None = None

    # ------------------------------------------------------------------
    def load(self) -> None:
        self.vectorizer = joblib.load(self.artifacts_dir / VECTORIZER_FILE)
        matrix = sparse.load_npz(self.artifacts_dir / MATRIX_FILE).tocsr()
        self.matrix = matrix
        # scikit-learn already L2-normalises TF-IDF rows, but we do it again so
        # a dot product is guaranteed to equal cosine similarity.
        self._normalized = normalize(matrix, norm="l2", axis=1, copy=True)

    # ------------------------------------------------------------------
    @property
    def n_products(self) -> int:
        return 0 if self.matrix is None else int(self.matrix.shape[0])

    def _cosine(self, query: sparse.csr_matrix) -> np.ndarray:
        assert self._normalized is not None
        query = normalize(query, norm="l2", axis=1, copy=True)
        scores = self._normalized @ query.T
        return np.asarray(scores.todense()).ravel().astype(np.float32)

    def score_by_index(self, index: int) -> np.ndarray:
        assert self.matrix is not None
        return self._cosine(self.matrix[index])

    def score_by_text(self, text: str) -> np.ndarray:
        assert self.vectorizer is not None
        return self._cosine(self.vectorizer.transform([clean_text(text)]))

    # ------------------------------------------------------------------
    def explain(self, text: str) -> dict[str, Any]:
        assert self.vectorizer is not None
        cleaned = clean_text(text)
        vector = self.vectorizer.transform([cleaned])
        features = self.vectorizer.get_feature_names_out()
        vocabulary = self.vectorizer.vocabulary_

        dense = vector.toarray().ravel()
        order = dense.argsort()[::-1][:10]
        top_terms = [
            {"term": str(features[i]), "weight": round(float(dense[i]), 4)}
            for i in order
            if dense[i] > 0
        ]

        tokens = tokenize(cleaned)
        unknown = sorted({tok for tok in tokens if tok not in vocabulary})

        return {
            "cleaned_text": cleaned,
            "tokens": tokens,
            "matched_features": int(vector.nnz),
            "top_terms": top_terms,
            "unknown_tokens": unknown,
            "vector_is_empty": bool(vector.nnz == 0),
            "note": (
                "No catalogue term matched, so TF-IDF cannot rank this query."
                if vector.nnz == 0
                else "Query mapped onto learned vocabulary terms."
            ),
        }

    # ------------------------------------------------------------------
    def info(self) -> RepresentationInfo:
        base = super().info()
        if self.loaded and self.matrix is not None:
            rows, cols = self.matrix.shape
            density = self.matrix.nnz / float(rows * cols) if rows and cols else 0.0
            base.dimensions = int(cols)
            base.vocabulary_size = int(cols)
            base.extra = {
                "non_zero_values": int(self.matrix.nnz),
                "sparsity_pct": round((1 - density) * 100, 4),
                "ngram_range": list(getattr(self.vectorizer, "ngram_range", (1, 1))),
                "min_df": getattr(self.vectorizer, "min_df", None),
            }
        return base
