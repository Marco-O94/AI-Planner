"""FastAPI application entrypoint."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import require_auth
from app.api.errors import register_error_handlers
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

app = FastAPI(title="AI Planner API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
