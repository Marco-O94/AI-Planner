# Backend image: uv-based. Runs migrations on start, then serves uvicorn.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# uv binary
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /uvx /bin/

WORKDIR /app

# Install dependencies first (layer-cached) using only the manifests.
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --no-install-project

# App source.
COPY . .
RUN uv sync --no-dev

EXPOSE 8000

# Apply migrations, then serve.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
