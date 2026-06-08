"""Runtime configuration, read from the environment.

All knobs are optional with sensible localhost defaults so ``python -m
project_notes_mcp`` works out of the box for local Claude Code (stdio).
"""

from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_BACKEND_URL = "http://localhost:8000"
DEFAULT_TRANSPORT = "stdio"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8050
DEFAULT_TIMEOUT = 30.0

_VALID_TRANSPORTS = {"stdio", "sse", "streamable-http"}


@dataclass(frozen=True)
class Settings:
    """Immutable server settings."""

    backend_url: str
    transport: str
    host: str
    port: int
    timeout: float


def load_settings(env: dict[str, str] | None = None) -> Settings:
    """Build :class:`Settings` from ``env`` (defaults to ``os.environ``).

    Raises ``ValueError`` for an unknown ``MCP_TRANSPORT`` so misconfiguration
    fails fast at startup rather than silently falling back.
    """
    source = os.environ if env is None else env

    transport = source.get("MCP_TRANSPORT", DEFAULT_TRANSPORT).strip().lower()
    if transport not in _VALID_TRANSPORTS:
        valid = ", ".join(sorted(_VALID_TRANSPORTS))
        raise ValueError(f"MCP_TRANSPORT must be one of: {valid} (got {transport!r})")

    return Settings(
        backend_url=source.get("BACKEND_URL", DEFAULT_BACKEND_URL).rstrip("/"),
        transport=transport,
        host=source.get("MCP_HOST", DEFAULT_HOST),
        port=int(source.get("MCP_PORT", str(DEFAULT_PORT))),
        timeout=float(source.get("BACKEND_TIMEOUT", str(DEFAULT_TIMEOUT))),
    )
