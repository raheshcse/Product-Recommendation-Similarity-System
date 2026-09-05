"""Pydantic request/response models (also drive the OpenAPI docs)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


# ----------------------------------------------------------------------
# Requests
# ----------------------------------------------------------------------
class RecommendRequest(BaseModel):
    product_id: int | None = Field(
        default=None, ge=0, description="Row index of a catalogue product to use as the query."
    )
    query_text: str | None = Field(
        default=None, max_length=500, description="Free product text, used when product_id is absent."
    )
    models: list[str] = Field(
        default_factory=lambda: ["tfidf", "word2vec", "fasttext"],
        description="Representations to rank with: tfidf | word2vec | fasttext | hybrid.",
    )
    top_n: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)
    category_filter: str | None = Field(default=None, description="Restrict results to one main category.")

    @model_validator(mode="after")
    def _one_query_source(self):
        if self.product_id is None and not (self.query_text or "").strip():
            raise ValueError("Provide either 'product_id' or a non-empty 'query_text'.")
        if not self.models:
            raise ValueError("Select at least one model.")
        return self


class ExplainRequest(BaseModel):
    product_id: int | None = Field(default=None, ge=0)
    query_text: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _one_query_source(self):
        if self.product_id is None and not (self.query_text or "").strip():
            raise ValueError("Provide either 'product_id' or a non-empty 'query_text'.")
        return self


# ----------------------------------------------------------------------
# Responses
# ----------------------------------------------------------------------
class Product(BaseModel):
    product_id: int
    name: str
    main_category: str
    subcategory: str
    combined_text: str


class Recommendation(Product):
    rank: int
    similarity_score: float


class ScoreSummary(BaseModel):
    max: float
    mean: float
    min: float
    std: float


class ModelResult(BaseModel):
    model: str
    model_name: str
    available: bool
    error: str | None = None
    elapsed_ms: float
    recommendations: list[Recommendation]
    score_summary: ScoreSummary | None = None


class QueryEcho(BaseModel):
    mode: str
    product: Product | None = None
    raw_text: str | None = None
    processed_text: str
    top_n: int
    min_score: float
    category_filter: str | None = None


class Agreement(BaseModel):
    overlap_pct: float | None = None
    shared_product_ids: list[int] = Field(default_factory=list)
    pairwise: list[dict[str, Any]] = Field(default_factory=list)


class RecommendResponse(BaseModel):
    query: QueryEcho
    results: list[ModelResult]
    agreement: Agreement


class ModelInfo(BaseModel):
    key: str
    name: str
    family: str
    description: str
    handles_unseen_words: bool
    loaded: bool
    n_products: int = 0
    dimensions: int = 0
    vocabulary_size: int = 0
    extra: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    catalogue_loaded: bool
    catalogue_size: int
    models_available: list[str]
    model_errors: dict[str, str] = Field(default_factory=dict)
