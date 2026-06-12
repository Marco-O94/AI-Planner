"""Auth service: registration, login, logout, and session resolution.

Depends only on domain Protocols (repositories + security ports) — no SQLAlchemy,
no pwdlib, no FastAPI. Passwords are verified against a stored hash; sessions are
opaque server-side tokens whose hash is the only value persisted.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.domain.entities import Session, User
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.domain.ports import PasswordHasher, TokenGenerator
from app.domain.repositories import SessionRepository, UserRepository


def _normalize_email(email: str) -> str:
    return email.strip().lower()


class AuthService:
    # A throwaway hash verified on the user-not-found path so login runs the same
    # Argon2 work whether or not the email exists (blocks timing enumeration).
    # Computed once, lazily, from the injected hasher — never per request.
    _dummy_password_hash: str | None = None

    def __init__(
        self,
        user_repo: UserRepository,
        session_repo: SessionRepository,
        hasher: PasswordHasher,
        token_gen: TokenGenerator,
        *,
        session_ttl_seconds: int,
    ) -> None:
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.hasher = hasher
        self.token_gen = token_gen
        self.session_ttl_seconds = session_ttl_seconds

    def register(self, email: str, password: str) -> User:
        normalized = _normalize_email(email)
        if self.user_repo.get_by_email(normalized) is not None:
            raise ConflictError("email already registered")
        return self.user_repo.add(
            User(
                id=uuid.uuid4(),
                email=normalized,
                password_hash=self.hasher.hash(password),
                is_active=True,
            )
        )

    def login(self, email: str, password: str) -> tuple[User, str]:
        user = self.user_repo.get_by_email(_normalize_email(email))
        # Always run verify (against a real hash on the miss path) so an attacker
        # can't tell "no such user" from "wrong password" by response time.
        candidate_hash = user.password_hash if user is not None else self._timing_hash()
        password_ok = self.hasher.verify(password, candidate_hash)
        if user is None or not user.is_active or not password_ok:
            raise AuthenticationError("invalid email or password")
        return user, self.issue_session(user)

    def _timing_hash(self) -> str:
        if AuthService._dummy_password_hash is None:
            AuthService._dummy_password_hash = self.hasher.hash(
                "timing-equalization-placeholder"
            )
        return AuthService._dummy_password_hash

    def issue_session(self, user: User) -> str:
        """Create a session for an already-authenticated user; return the raw token."""
        raw_token = self.token_gen.generate()
        expires_at = datetime.now(UTC) + timedelta(seconds=self.session_ttl_seconds)
        self.session_repo.add(
            Session(
                id=uuid.uuid4(),
                user_id=user.id,
                token_hash=self.token_gen.hash_token(raw_token),
                expires_at=expires_at,
            )
        )
        return raw_token

    def logout(self, raw_token: str) -> None:
        self.session_repo.delete_by_token_hash(self.token_gen.hash_token(raw_token))

    def principal_for_session(self, raw_token: str) -> User | None:
        """Resolve the active user for a raw session token, or None if invalid/expired."""
        token_hash = self.token_gen.hash_token(raw_token)
        session = self.session_repo.get_by_token_hash(token_hash)
        if session is None:
            return None
        if _expired(session.expires_at):
            self.session_repo.delete_by_token_hash(token_hash)
            return None
        user = self.user_repo.get_by_id(session.user_id)
        if user is None or not user.is_active:
            return None
        return user

    def get_user(self, user_id: uuid.UUID) -> User:
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("user not found")
        return user


def _expired(expires_at: datetime) -> bool:
    # Stored timestamps are tz-aware; guard against a naive value just in case.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= datetime.now(UTC)
