"""
CodeSense AI — application configuration.
by Nitish Singh

A single, typed ``Settings`` object is the only place the process reads the
environment. Everything downstream imports ``settings`` from here, which keeps
configuration testable (override via env or a ``.env`` file) and makes the set
of tunable knobs self-documenting.
"""

from __future__ import annotations

import secrets
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide configuration, hydrated from environment variables / ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Identity ────────────────────────────────────────────────────────────
    project_name: str = "CodeSense AI"
    author: str = "Nitish Singh"
    version: str = "2.0.0"
    environment: str = Field(default="development", description="development | staging | production")

    # ── Security / JWT ─────────────────────────────────────────────────────
    # A random key is generated per-process if none is supplied. That is fine for
    # local demos (tokens simply don't survive a restart) but MUST be pinned in
    # any deployed environment so tokens remain valid across replicas/restarts.
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days — demo-friendly

    # bcrypt work factor. 12 is a sane 2025 default (~250 ms/hash on commodity HW).
    bcrypt_rounds: int = 12

    # ── Persistence ───────────────────────────────────────────────────────
    # Async SQLAlchemy URL. Defaults to a file-backed SQLite DB next to the app.
    database_url: str = "sqlite+aiosqlite:///./database.db"
    db_echo: bool = False

    # ── CORS ─────────────────────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )

    # ── Rate limiting (in-memory; swap for Redis in prod) ─────────────────
    rate_limit_enabled: bool = True
    rate_limit_analyze_per_minute: int = 30
    rate_limit_auth_per_minute: int = 15

    # ── Demo / guest account (one-click login for reviewers) ──────────────
    demo_email: str = "demo@codesense.ai"
    demo_password: str = "DemoPass123!"
    demo_full_name: str = "Guest Reviewer"

    # ── Gemini (delegated to services.gemini_service, mirrored here for docs) ─
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_fallback_model: str = "gemini-3.5-flash-lite"
    gemini_timeout_s: float = 45.0

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        """Allow ``CORS_ORIGINS="a,b,c"`` in addition to a JSON list."""
        if isinstance(v, str) and not v.strip().startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so the environment is parsed exactly once per process."""
    return Settings()


settings: Settings = get_settings()
