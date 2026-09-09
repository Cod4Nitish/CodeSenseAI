"""
CodeSense AI — FastAPI application entrypoint.
by Nitish Singh
"""

import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env before importing anything that reads the environment.
load_dotenv()

from routers.analyze import router as analyze_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("codesense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CodeSense AI backend — starting up")
    yield
    logger.info("CodeSense AI backend — shutting down")


app = FastAPI(
    title="CodeSense AI",
    description="AI-powered code review backend, powered by Google Gemini. by Nitish Singh",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — dev servers (Vite dev + Vite preview) on both loopback spellings.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    if request.url.path.startswith("/api/"):
        logger.info("%s %s -> %s (%.0f ms)",
                    request.method, request.url.path, response.status_code, elapsed_ms)
    return response


app.include_router(analyze_router, prefix="/api")


@app.get("/", tags=["meta"])
async def root():
    return {
        "name": "CodeSense AI",
        "author": "Nitish Singh",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["meta"])
async def health_check():
    return {"status": "ok", "service": "CodeSense AI", "author": "Nitish Singh"}
