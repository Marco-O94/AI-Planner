"""Settings loading: defaults, overrides, and fail-fast on bad transport."""

import pytest

from project_notes_mcp.config import load_settings


def test_defaults_target_localhost_stdio():
    settings = load_settings(env={})

    assert settings.backend_url == "http://localhost:8000"
    assert settings.transport == "stdio"
    assert settings.host == "127.0.0.1"  # secure-by-default: loopback unless opted in
    assert settings.port == 8050


def test_env_overrides_are_applied():
    settings = load_settings(
        env={
            "BACKEND_URL": "http://backend:8000/",
            "MCP_TRANSPORT": "SSE",
            "MCP_HOST": "127.0.0.1",
            "MCP_PORT": "9001",
            "BACKEND_TIMEOUT": "5",
        }
    )

    assert settings.backend_url == "http://backend:8000"  # trailing slash stripped
    assert settings.transport == "sse"  # normalized lowercase
    assert settings.host == "127.0.0.1"
    assert settings.port == 9001
    assert settings.timeout == 5.0


def test_unknown_transport_raises():
    with pytest.raises(ValueError, match="MCP_TRANSPORT"):
        load_settings(env={"MCP_TRANSPORT": "carrier-pigeon"})
