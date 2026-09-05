"""Recommendation, explainability and model-introspection endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_engine, get_evaluator
from app.schemas.recommendation import (
    ExplainRequest,
    ModelInfo,
    RecommendRequest,
    RecommendResponse,
)
from app.services.evaluation import EvaluationService
from app.services.recommender import RecommendationEngine

router = APIRouter(tags=["recommendations"])


@router.get("/models", response_model=list[ModelInfo], summary="Available representations")
def list_models(engine: RecommendationEngine = Depends(get_engine)) -> list[dict[str, Any]]:
    return engine.model_catalogue()


@router.post("/recommend", response_model=RecommendResponse, summary="Top-N similar products")
def recommend(
    payload: RecommendRequest,
    engine: RecommendationEngine = Depends(get_engine),
) -> dict[str, Any]:
    try:
        return engine.recommend(
            models=payload.models,
            product_id=payload.product_id,
            query_text=payload.query_text,
            top_n=payload.top_n,
            min_score=payload.min_score,
            category_filter=payload.category_filter,
        )
    except IndexError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/explain", summary="Stage-by-stage pipeline trace for a query")
def explain(
    payload: ExplainRequest,
    engine: RecommendationEngine = Depends(get_engine),
) -> dict[str, Any]:
    try:
        return engine.explain(product_id=payload.product_id, query_text=payload.query_text)
    except IndexError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/neighbours", summary="Nearest words in the embedding space")
def neighbours(
    word: str = Query(..., min_length=1, max_length=60),
    top_n: int = Query(default=8, ge=1, le=25),
    engine: RecommendationEngine = Depends(get_engine),
) -> dict[str, Any]:
    return engine.neighbour_words(word, top_n=top_n)


@router.get("/evaluation", summary="Offline quality metrics per representation")
def evaluation(
    sample_size: int | None = Query(default=None, ge=25, le=5000),
    k: int | None = Query(default=None, ge=1, le=50),
    seed: int = Query(default=42),
    evaluator: EvaluationService = Depends(get_evaluator),
) -> dict[str, Any]:
    return evaluator.run(sample_size=sample_size, k=k, seed=seed)
