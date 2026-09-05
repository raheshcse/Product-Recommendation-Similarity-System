"""Shared FastAPI dependencies.

The engine is expensive to construct (it holds the catalogue and every vector
matrix in memory), so it is built once during application start-up and handed to
routes through these dependencies.
"""

from __future__ import annotations

from fastapi import HTTPException, Request, status

from app.services.evaluation import EvaluationService
from app.services.recommender import RecommendationEngine


def get_engine(request: Request) -> RecommendationEngine:
    engine: RecommendationEngine | None = getattr(request.app.state, "engine", None)
    if engine is None or not engine.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Recommendation engine is not ready. Build the model artifacts first: "
                "python scripts/build_artifacts.py"
            ),
        )
    return engine


def get_evaluator(request: Request) -> EvaluationService:
    evaluator: EvaluationService | None = getattr(request.app.state, "evaluator", None)
    if evaluator is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evaluation service is not ready.",
        )
    return evaluator
