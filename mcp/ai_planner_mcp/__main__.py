"""Entry point: ``python -m ai_planner_mcp``.

Builds settings from the environment, wires a backend client into the FastMCP
server, and runs the selected transport:

- ``stdio`` (default) — for local Claude Code.
- ``sse`` / ``streamable-http`` — for running as a containerized service; host
  and port come from ``MCP_HOST`` / ``MCP_PORT``.
"""

from __future__ import annotations

import sys

from .client import BackendClient
from .config import load_settings
from .server import build_server


def main() -> None:
    settings = load_settings()
    client = BackendClient(
        settings.backend_url,
        timeout=settings.timeout,
        service_api_key=settings.service_api_key,
    )
    server = build_server(client, host=settings.host, port=settings.port)

    print(
        f"[ai-planner-mcp] transport={settings.transport} "
        f"backend={settings.backend_url}",
        file=sys.stderr,
        flush=True,
    )
    if not settings.service_api_key:
        print(
            "[ai-planner-mcp] WARNING: SERVICE_API_KEY is unset — calls to an "
            "auth-gated backend will fail with 401.",
            file=sys.stderr,
            flush=True,
        )
    try:
        server.run(transport=settings.transport)
    finally:
        client.close()


if __name__ == "__main__":
    main()
