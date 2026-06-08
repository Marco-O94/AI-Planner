# MCP server image: uv-based. Talks to the backend over HTTP; runs SSE by default in compose.
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

# Default service port for SSE/HTTP transport (override with MCP_PORT).
EXPOSE 8050

CMD ["uv", "run", "python", "-m", "project_notes_mcp"]
