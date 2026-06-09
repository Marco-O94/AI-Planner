"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.routers import (
    admin,
    artifact_types,
    artifacts,
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
    app.include_router(module.router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
