"""Application configuration.

All tunable values live here so that nothing in the service layer needs to be
edited when paths, ports or model hyper-parameters change.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings, overridable through environment variables or `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    app_name: str = "Acme Retail - Product Recommendation Similarity System"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    debug: bool = False

    # Comma separated list of origins allowed to call the API.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ------------------------------------------------------------------
    # Data & artifact locations
    # ------------------------------------------------------------------
    data_dir: Path = BACKEND_ROOT / "data"
    artifacts_dir: Path = BACKEND_ROOT / "artifacts"
    prepared_dataset: str = "AcmeRetail_Products_Prepared.csv"

    # ------------------------------------------------------------------
    # Retrieval behaviour
    # ------------------------------------------------------------------
    default_top_n: int = 10
    max_top_n: int = 50
    catalogue_search_limit: int = 25

    # Weights used by the hybrid (ensemble) representation.
    hybrid_weights: dict[str, float] = Field(
        default_factory=lambda: {"tfidf": 0.4, "word2vec": 0.2, "fasttext": 0.4}
    )

    # ------------------------------------------------------------------
    # Training hyper-parameters (used by scripts/build_artifacts.py)
    # ------------------------------------------------------------------
    tfidf_ngram_min: int = 1
    tfidf_ngram_max: int = 2
    tfidf_min_df: int = 2

    embedding_dim: int = 100
    embedding_window: int = 5
    embedding_min_count: int = 2
    embedding_epochs: int = 10
    embedding_workers: int = 4
    embedding_seed: int = 42

    # FastText character n-gram range and hash-bucket size.  The bucket is kept
    # well below the gensim default (2,000,000) so that the saved artifact stays
    # a few hundred MB smaller without a measurable quality loss on a catalogue
    # of this size.
    fasttext_min_n: int = 3
    fasttext_max_n: int = 6
    fasttext_buckets: int = 200_000

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------
    evaluation_sample_size: int = 400
    evaluation_k: int = 10

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def prepared_dataset_path(self) -> Path:
        return self.data_dir / self.prepared_dataset


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance (import this, never instantiate Settings directly)."""
    return Settings()
