"""FastAPI application entrypoint."""

import asyncio
import contextlib
from collections.abc import AsyncIterator

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.deps import require_auth
from app.api.errors import rate_limit_handler, register_error_handlers
from app.api.rate_limit import limiter
from app.api.routers import (
    admin,
    artifact_types,
    artifacts,
    auth,
    documents,
    domains,
    note_types,
    notes,
    projects,
    search,
    skills,
    tasks,
    technologies,
    templates,
)
from app.config import settings
from app.infrastructure.db import SessionLocal
from app.infrastructure.repositories import SqlSessionRepository

_INSECURE_DEFAULTS = {"dev-insecure-change-me", "dev-service-key-change-me"}
_SESSION_PURGE_INTERVAL_SECONDS = 60 * 60  # hourly


def _guard_production_secrets() -> None:
    """Fail fast if a production deploy still carries shipped default secrets."""
    if settings.environment != "production":
        return
    offenders = [
        name
        for name, value in (
            ("SECRET_KEY", settings.secret_key),
            ("SERVICE_API_KEY", settings.service_api_key),
        )
        if value in _INSECURE_DEFAULTS
    ]
    if offenders:
        raise RuntimeError(
            "Refusing to start in production with default secret(s): "
            f"{', '.join(offenders)}. Rotate them (deploy.sh vps does this)."
        )


_guard_production_secrets()


def _purge_expired_sessions() -> int:
    db = SessionLocal()
    try:
        removed = SqlSessionRepository(db).delete_expired()
        db.commit()
        return removed
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Background loop that purges expired sessions so the table can't grow without bound."""

    async def _loop() -> None:
        while True:
            await asyncio.sleep(_SESSION_PURGE_INTERVAL_SECONDS)
            with contextlib.suppress(Exception):
                await asyncio.to_thread(_purge_expired_sessions)

    task = asyncio.create_task(_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


_is_prod = settings.environment == "production"

app = FastAPI(
    title="AI Planner API",
    version="0.1.0",
    lifespan=lifespan,
    # Hide the schema surface in production.
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

# Rate limiting (slowapi) for the unauthenticated auth endpoints.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    # Only what the browser legitimately sends. NOT a wildcard: with
    # allow_credentials, "*" would let any allowed-origin page forge the service
    # key header. The MCP calls the API server-to-server (no CORS), so it's fine.
    allow_headers=["Content-Type", "Accept"],
)

register_error_handlers(app)

# Public router: register/login must be reachable without a session.
# (logout/me carry their own require_auth at the route level.)
app.include_router(auth.router)

# Every data router is gated: a valid session cookie OR the service API key.
for module in (
    projects,
    technologies,
    domains,
    notes,
    note_types,
    tasks,
    artifact_types,
    artifacts,
    skills,
    documents,
    search,
    templates,
    admin,
):
    app.include_router(module.router, dependencies=[Depends(require_auth)])


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe (public)."""
    return {"status": "ok"}
