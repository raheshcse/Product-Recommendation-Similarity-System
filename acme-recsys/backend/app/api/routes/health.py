"""Liveness and readiness."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.recommendation import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Service health")
def health(request: Request) -> HealthResponse:
    settings = get_settings()
    engine = getattr(request.app.state, "engine", None)

    if engine is None:
        return HealthResponse(
            status="starting",
            app=settings.app_name,
            version=settings.app_version,
            catalogue_loaded=False,
            catalogue_size=0,
            models_available=[],
        )

    available = engine.available_keys()
    return HealthResponse(
        status="ok" if available else "degraded",
        app=settings.app_name,
        version=settings.app_version,
        catalogue_loaded=engine.catalogue.size > 0,
        catalogue_size=engine.catalogue.size,
        models_available=available,
        model_errors=engine.load_errors,
    )
