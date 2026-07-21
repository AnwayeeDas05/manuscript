"""
Application configuration — all values loaded from environment variables / .env file.
Never hardcode secrets. Use pydantic-settings for type-safe config.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────
    app_name: str = "Manuscript Intelligence Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # ── Database ─────────────────────────────────────────────────────────
    # Supports both PostgreSQL (prod) and SQLite (local dev)
    database_url: str = "sqlite+aiosqlite:///./manuscript.db"

    # ── Auth ─────────────────────────────────────────────────────────────
    jwt_secret_key: str = "CHANGE-ME-IN-PRODUCTION-USE-A-LONG-RANDOM-STRING-AT-LEAST-32-CHARS"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24  # 24 hours

    # ── Google Gemini ─────────────────────────────────────────────────────
    google_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    gemini_temperature: float = 0.1  # Low temp → deterministic JSON output

    # ── File Storage ──────────────────────────────────────────────────────
    uploads_dir: str = "uploads"
    max_file_size_mb: int = 50
    allowed_extensions: list[str] = ["pdf", "docx"]

    # ── NLP ───────────────────────────────────────────────────────────────
    spacy_model: str = "en_core_web_sm"

    # ── Processing ────────────────────────────────────────────────────────
    # Max chars sent to each AI agent (context window guard)
    max_context_chars: int = 80_000

    # ── CORS ─────────────────────────────────────────────────────────────
    # Comma-separated list of extra allowed origins (e.g. your Vercel URL)
    cors_allowed_origins: str = ""

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def uploads_path(self) -> Path:
        path = Path(self.uploads_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
