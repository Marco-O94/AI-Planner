"""Application settings, loaded from environment / .env (pydantic-settings)."""

from functools import lru_cache
from typing import Annotated

from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _split_csv(value: object) -> object:
    """Allow comma-separated env strings for list fields (not just JSON)."""
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Postgres connection (SQLAlchemy + psycopg3 driver).
    database_url: str = (
        "postgresql+psycopg://projectnotes:projectnotes@localhost:5432/projectnotes"
    )
    # Qdrant endpoint for vector search (used from Phase 3 onward).
    qdrant_url: str = "http://localhost:6333"
    # FastEmbed model name (CPU); used from Phase 3 onward.
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    # Qdrant collection holding all knowledge vectors.
    vector_collection: str = "knowledge"
    # Directory where uploaded document originals are stored.
    storage_dir: str = "./var/storage"
    # Allowed CORS origins for the frontend (comma-separated in env).
    cors_origins: Annotated[list[str], NoDecode, BeforeValidator(_split_csv)] = [
        "http://localhost:3000"
    ]

    # --- Auth ---------------------------------------------------------------
    # Reserved for signing needs; rotate in production (deploy.sh vps does this).
    secret_key: str = "dev-insecure-change-me"
    # Static key the MCP service sends (X-Service-API-Key) to call the API headless.
    service_api_key: str = "dev-service-key-change-me"
    # Session lifetime / cookie behaviour.
    session_ttl_seconds: int = 60 * 60 * 24 * 14  # 14 days
    session_cookie_name: str = "ai_planner_session"
    session_cookie_secure: bool = False  # True behind TLS (deploy.sh vps --tls)
    session_cookie_samesite: str = "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
