"""Shared pytest fixtures.

The schema fixtures apply Alembic migrations to the configured database (the
docker-compose Postgres) so the tests verify the *real* migrated schema, not a
metadata snapshot. Migrations are idempotent, so this is a no-op when already
at head.
"""

from collections.abc import Generator

import pytest
from alembic.config import Config
from sqlalchemy import Connection, Engine, create_engine

from alembic import command
from app.config import settings


@pytest.fixture(scope="session")
def _migrated() -> None:
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(scope="session")
def engine(_migrated: None) -> Generator[Engine, None, None]:
    eng = create_engine(settings.database_url, future=True)
    yield eng
    eng.dispose()


@pytest.fixture
def conn(engine: Engine) -> Generator[Connection, None, None]:
    with engine.connect() as connection:
        yield connection
