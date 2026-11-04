"""
CodeSense AI — FastAPI application entrypoint.
by Nitish Singh

Wires together:
  * configuration (``core.config.settings``)
  * persistence bootstrap (``db.init_db`` on startup, ``dispose_db`` on shutdown)
  * routers: auth, reviews (audit history + analytics), analyze
  * cross-cutting middleware: request timing + latency metrics, CORS
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env before importing anything that reads the environment.
load_dotenv()

from pathlib import Path  # noqa: E402

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402
import mimetypes  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

mimetypes.add_type("image/webp", ".webp")  # some Python builds lack it; landing screenshots are .webp
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from core.config import settings  # noqa: E402
from core.metrics import api_latency  # noqa: E402
from db import dispose_db, init_db  # noqa: E402
from routers.analyze import router as analyze_router  # noqa: E402
from routers.diff import router as diff_router  # noqa: E402
from routers.ai import router as ai_router  # noqa: E402
from routers.github import router as github_router  # noqa: E402
from routers.auth import router as auth_router  # noqa: E402
from routers.reviews import router as reviews_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("codesense")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("%s v%s — starting up (%s)", settings.project_name, settings.version, settings.environment)
    if settings.secret_key and len(settings.secret_key) < 32:
        logger.warning("SECRET_KEY looks weak — set a strong value in production.")
    await init_db()
    yield
    await dispose_db()
    logger.info("%s — shut down cleanly", settings.project_name)


app = FastAPI(
    title=settings.project_name,
    description=(
        "AI-powered code-review platform — authentication, per-user audit "
        "history, and analytics. Powered by Google Gemini. by Nitish Singh"
    ),
    version=settings.version,
    lifespan=lifespan,
    contact={"name": settings.author},
    license_info={"name": "MIT"},
)

# ---------------------------------------------------------------------------
# CORS — Vite dev (5173/5174) + preview (4173) on both loopback spellings.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time-Ms"],
)


@app.middleware("http")
async def timing_and_metrics(request: Request, call_next):
    """Attach an ``X-Process-Time-Ms`` header and feed the latency tracker."""
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    if request.url.path.startswith("/api/"):
        api_latency.record(elapsed_ms)
        logger.info(
            "%s %s -> %s (%.0f ms)",
            request.method, request.url.path, response.status_code, elapsed_ms,
        )
    return response


app.include_router(auth_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
app.include_router(diff_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(github_router, prefix="/api")


_STATIC = Path(__file__).parent / "static"
_HAS_UI = (_STATIC / "index.html").is_file()


@app.get("/api", tags=["meta"], include_in_schema=False)
async def root() -> dict:
    return {
        "name": settings.project_name,
        "version": settings.version,
        "author": settings.author,
        "docs": "/docs",
        "health": "/api/health",
    }


if not _HAS_UI:
    app.add_api_route("/", root, methods=["GET"], tags=["meta"])


@app.get("/api/health", tags=["meta"])
async def health_check() -> dict:
    """
    Liveness + measured latency. The frontend renders ``ai_engine`` /
    ``latency.p99_ms`` as the live "AI Engine: Active · p99 < …s" status pill,
    so those numbers are real, not decorative.
    """
    api = api_latency.snapshot()
    from core.metrics import ai_latency  # local import: avoids a cycle at module load

    ai = ai_latency.snapshot()
    return {
        "status": "ok",
        "service": settings.project_name,
        "version": settings.version,
        "author": settings.author,
        "environment": settings.environment,
        "ai_engine": "active",
        "latency": {
            "api_p50_ms": api.p50_ms,
            "api_p99_ms": api.p99_ms,
            "api_samples": api.sample_count,
            "ai_p50_ms": ai.p50_ms,
            "ai_p99_ms": ai.p99_ms,
            "ai_samples": ai.sample_count,
        },
    }


# ---------------------------------------------------------------------------
# Single-container deploy: serve the built React app (./static) from FastAPI.
# Registered last so every /api route wins. Unknown paths fall back to
# index.html so client-side routes (/pr, /learn, /welcome...) work on refresh.
# ---------------------------------------------------------------------------
if _HAS_UI:
    if (_STATIC / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=_STATIC / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith(("api/", "docs", "openapi.json", "redoc")):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")
        target = (_STATIC / full_path).resolve()
        if full_path and target.is_file() and _STATIC.resolve() in target.parents:
            return FileResponse(target, headers={"Cache-Control": "no-cache"})
        # index.html names the hashed asset files of the current build: never cache it.
        return FileResponse(_STATIC / "index.html", headers={"Cache-Control": "no-store, must-revalidate"})
