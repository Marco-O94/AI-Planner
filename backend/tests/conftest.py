"""Shared pytest fixtures.

The schema fixtures apply Alembic migrations to the configured database (the
docker-compose Postgres) so the tests verify the *real* migrated schema, not a
metadata snapshot. Migrations are idempotent, so this is a no-op when already
at head.
"""

import uuid
from collections.abc import Callable, Generator

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, create_engine

from alembic import command
from app.api.rate_limit import limiter
from app.config import settings
from app.main import app

# Tests hammer /auth/* from one client IP; the rate limiter would 429 them.
limiter.enabled = False


@pytest.fixture(scope="session")
def _migrated() -> None:
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture
def client(_migrated: None) -> TestClient:
    # All data routers are now auth-gated; send the static service key by default so
    # existing tests exercise the real guard (the service-key path is a production
    # credential, not a bypass). Auth-flow tests build their own keyless clients.
    return TestClient(app, headers={"X-Service-API-Key": settings.service_api_key})


@pytest.fixture
def make_project(client: TestClient) -> Generator[Callable[..., dict], None, None]:
    """Create uniquely-named projects via the API and cascade-delete them after."""
    created: list[str] = []

    def _make(name: str | None = None, **extra) -> dict:
        name = name or f"Proj {uuid.uuid4().hex[:8]}"
        response = client.post("/projects", json={"name": name, **extra})
        assert response.status_code == 201, response.text
        body = response.json()
        created.append(body["slug"])
        return body

    yield _make

    for slug in created:
        client.delete(f"/projects/{slug}")


@pytest.fixture(scope="session")
def engine(_migrated: None) -> Generator[Engine, None, None]:
    eng = create_engine(settings.database_url, future=True)
    yield eng
    eng.dispose()


@pytest.fixture
def conn(engine: Engine) -> Generator[Connection, None, None]:
    with engine.connect() as connection:
        yield connection
