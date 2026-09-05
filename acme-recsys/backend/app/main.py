"""FastAPI application factory and lifespan wiring."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import catalogue, health, recommend
from app.core.config import BACKEND_ROOT, get_settings
from app.core.logging import configure_logging, get_logger
from app.services.evaluation import EvaluationService
from app.services.recommender import RecommendationEngine

logger = get_logger(__name__)

DESCRIPTION = """
Meaning-based product similarity for the Acme Retail catalogue.

Give the API a catalogue product **or** any free product text and it returns the
top-N most similar products, ranked by cosine similarity, from three interchangeable
representations plus a weighted hybrid:

* **TF-IDF** - sparse lexical baseline
* **Word2Vec** - dense skip-gram embeddings, mean-pooled per product
* **FastText** - sub-word embeddings that also cover unseen words
* **Hybrid** - weighted blend of the above

All text cleaning, vectorisation, scoring and ranking happen inside the service.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()

    engine = RecommendationEngine(settings)
    try:
        engine.load()
    except Exception as exc:  # noqa: BLE001 - keep the API up so /health can explain
        logger.error("Engine failed to start: %s", exc)

    app.state.engine = engine
    app.state.evaluator = EvaluationService(engine)

    yield

    app.state.engine = None
    app.state.evaluator = None


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(catalogue.router, prefix=settings.api_prefix)
    app.include_router(recommend.router, prefix=settings.api_prefix)

    # In development the React dev server proxies /api here. If the frontend has
    # been built (`npm run build`), serve it from the same origin so the whole
    # application runs from a single process.
    dist_dir = BACKEND_ROOT.parent / "frontend" / "dist"
    if dist_dir.is_dir():
        app.mount("/", SPAStaticFiles(directory=dist_dir, html=True), name="frontend")
        logger.info("Serving built frontend from %s", dist_dir)
    else:

        @app.get("/", include_in_schema=False)
        def root() -> JSONResponse:
            return JSONResponse(
                {
                    "service": settings.app_name,
                    "version": settings.app_version,
                    "docs": "/docs",
                    "health": f"{settings.api_prefix}/health",
                    "frontend": "Run `npm run dev` in ../frontend, or `npm run build` to serve it here.",
                }
            )

    return app


class SPAStaticFiles(StaticFiles):
    """Static files with a single-page-app fallback to index.html."""

    async def get_response(self, path: str, scope):  # type: ignore[override]
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


app = create_app()
