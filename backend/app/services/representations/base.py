"""Common contract every text representation must satisfy.

Adding a new representation (SBERT, GloVe, a hosted embedding API, ...) means
writing one subclass and registering it — no change to the similarity engine,
the recommender or the API layer.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np


@dataclass
class RepresentationInfo:
    """Human-readable description of a loaded representation."""

    key: str
    name: str
    family: str
    description: str
    handles_unseen_words: bool
    loaded: bool = False
    n_products: int = 0
    dimensions: int = 0
    vocabulary_size: int = 0
    extra: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class BaseRepresentation(abc.ABC):
    """Turns product text into vectors and scores a query against the catalogue."""

    key: str = "base"
    name: str = "Base"
    family: str = "generic"
    description: str = ""
    handles_unseen_words: bool = False

    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        self.loaded = False
        self.error: str | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    @abc.abstractmethod
    def load(self) -> None:
        """Load artifacts from disk. Raise on failure."""

    def safe_load(self) -> bool:
        """Load, capturing failure so one missing model never breaks the API."""
        try:
            self.load()
            self.loaded = True
            self.error = None
        except Exception as exc:  # noqa: BLE001 - surfaced through /api/models
            self.loaded = False
            self.error = f"{type(exc).__name__}: {exc}"
        return self.loaded

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    @abc.abstractmethod
    def score_by_index(self, index: int) -> np.ndarray:
        """Cosine similarity of catalogue row `index` against every product."""

    @abc.abstractmethod
    def score_by_text(self, text: str) -> np.ndarray:
        """Cosine similarity of arbitrary text against every product."""

    @abc.abstractmethod
    def explain(self, text: str) -> dict[str, Any]:
        """Diagnostics describing how `text` was turned into a vector."""

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    @property
    @abc.abstractmethod
    def n_products(self) -> int: ...

    def info(self) -> RepresentationInfo:
        return RepresentationInfo(
            key=self.key,
            name=self.name,
            family=self.family,
            description=self.description,
            handles_unseen_words=self.handles_unseen_words,
            loaded=self.loaded,
            n_products=self.n_products if self.loaded else 0,
            error=self.error,
        )
