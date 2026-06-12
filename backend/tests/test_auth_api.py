"""Auth flow: registration, login, session cookie, logout, and the route guard."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from app.config import settings
from app.main import app


def _email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


def _keyless() -> TestClient:
    """A client with NO service key — exercises the real cookie/401 paths."""
    return TestClient(app)


# --- guard -------------------------------------------------------------------


def test_protected_endpoint_without_credentials_is_401(_migrated: None) -> None:
    resp = _keyless().get("/projects")
    assert resp.status_code == 401


def test_service_api_key_bypasses_the_guard(_migrated: None) -> None:
    client = TestClient(app, headers={"X-Service-API-Key": settings.service_api_key})
    resp = client.get("/projects")
    assert resp.status_code == 200


def test_wrong_service_api_key_is_401(_migrated: None) -> None:
    client = TestClient(app, headers={"X-Service-API-Key": "nope"})
    assert client.get("/projects").status_code == 401


def test_health_stays_public(_migrated: None) -> None:
    assert _keyless().get("/health").status_code == 200


# --- registration ------------------------------------------------------------


def test_register_creates_user_logs_in_and_sets_cookie(_migrated: None) -> None:
    client = _keyless()
    email = _email()

    resp = client.post("/auth/register", json={"email": email, "password": "secret123"})

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == email
    assert body["is_active"] is True
    assert settings.session_cookie_name in resp.cookies
    # The session cookie now in the jar authenticates /auth/me.
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_register_duplicate_email_is_409(_migrated: None) -> None:
    email = _email()
    first = _keyless().post("/auth/register", json={"email": email, "password": "secret123"})
    assert first.status_code == 201
    second = _keyless().post("/auth/register", json={"email": email, "password": "secret123"})
    assert second.status_code == 409


def test_register_email_is_case_insensitive_for_uniqueness(_migrated: None) -> None:
    local = uuid.uuid4().hex[:12]
    _keyless().post(
        "/auth/register", json={"email": f"{local}@example.com", "password": "secret123"}
    )
    dup = _keyless().post(
        "/auth/register", json={"email": f"{local.upper()}@EXAMPLE.COM", "password": "secret123"}
    )
    assert dup.status_code == 409


def test_register_short_password_is_422(_migrated: None) -> None:
    resp = _keyless().post("/auth/register", json={"email": _email(), "password": "short"})
    assert resp.status_code == 422


def test_register_invalid_email_is_422(_migrated: None) -> None:
    resp = _keyless().post(
        "/auth/register", json={"email": "not-an-email", "password": "secret123"}
    )
    assert resp.status_code == 422


# --- login / logout ----------------------------------------------------------


def test_login_success_sets_cookie(_migrated: None) -> None:
    email = _email()
    _keyless().post("/auth/register", json={"email": email, "password": "secret123"})

    client = _keyless()
    resp = client.post("/auth/login", json={"email": email, "password": "secret123"})

    assert resp.status_code == 200
    assert settings.session_cookie_name in resp.cookies
    assert client.get("/auth/me").json()["email"] == email


def test_login_wrong_password_is_401(_migrated: None) -> None:
    email = _email()
    _keyless().post("/auth/register", json={"email": email, "password": "secret123"})
    resp = _keyless().post("/auth/login", json={"email": email, "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_unknown_email_is_401(_migrated: None) -> None:
    resp = _keyless().post("/auth/login", json={"email": _email(), "password": "secret123"})
    assert resp.status_code == 401


def test_me_without_session_is_401(_migrated: None) -> None:
    assert _keyless().get("/auth/me").status_code == 401


def test_logout_revokes_the_session(_migrated: None) -> None:
    client = _keyless()
    email = _email()
    client.post("/auth/register", json={"email": email, "password": "secret123"})
    assert client.get("/auth/me").status_code == 200

    assert client.post("/auth/logout").status_code == 204
    # The session row is gone; even if the cookie lingered it no longer resolves.
    assert _keyless().get("/auth/me").status_code == 401


def test_session_cookie_authenticates_data_routes(_migrated: None) -> None:
    client = _keyless()
    client.post("/auth/register", json={"email": _email(), "password": "secret123"})
    assert client.get("/projects").status_code == 200


def test_expired_session_is_rejected(_migrated: None, engine: Engine) -> None:
    client = _keyless()
    email = _email()
    client.post("/auth/register", json={"email": email, "password": "secret123"})

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE sessions SET expires_at = now() - interval '1 day' "
                "WHERE user_id = (SELECT id FROM users WHERE email = :email)"
            ),
            {"email": email},
        )

    assert client.get("/auth/me").status_code == 401
