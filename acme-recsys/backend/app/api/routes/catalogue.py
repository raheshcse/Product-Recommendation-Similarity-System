"""Catalogue browsing endpoints used by the product picker and the stats bar."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_engine
from app.core.config import get_settings
from app.schemas.recommendation import Product
from app.services.recommender import RecommendationEngine

router = APIRouter(prefix="/catalogue", tags=["catalogue"])


@router.get("/search", response_model=list[Product], summary="Type-ahead product search")
def search_products(
    q: str = Query(..., min_length=1, max_length=120, description="Partial product text"),
    limit: int | None = Query(default=None, ge=1, le=100),
    engine: RecommendationEngine = Depends(get_engine),
) -> list[dict[str, Any]]:
    settings = get_settings()
    return engine.catalogue.search(q, limit=limit or settings.catalogue_search_limit)


@router.get("/sample", response_model=list[Product], summary="Random products to start from")
def sample_products(
    n: int = Query(default=12, ge=1, le=60),
    seed: int | None = Query(default=None),
    engine: RecommendationEngine = Depends(get_engine),
) -> list[dict[str, Any]]:
    return engine.catalogue.sample(n=n, seed=seed)


@router.get("/product/{product_id}", response_model=Product, summary="Fetch one product")
def get_product(
    product_id: int,
    engine: RecommendationEngine = Depends(get_engine),
) -> dict[str, Any]:
    try:
        return engine.catalogue.get(product_id)
    except IndexError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/stats", summary="Catalogue summary statistics")
def catalogue_stats(engine: RecommendationEngine = Depends(get_engine)) -> dict[str, Any]:
    return engine.catalogue.stats()


@router.get("/categories", summary="Main categories with product counts")
def catalogue_categories(engine: RecommendationEngine = Depends(get_engine)) -> list[dict[str, Any]]:
    return engine.catalogue.categories()
