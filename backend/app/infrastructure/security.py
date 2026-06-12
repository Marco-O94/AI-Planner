"""Concrete security adapters (the only place pwdlib / secrets are imported).

Implements the domain security ports: Argon2id password hashing via pwdlib and
opaque session tokens via ``secrets`` + SHA-256.
"""

from __future__ import annotations

import hashlib
import secrets

from pwdlib import PasswordHash

# Recommended modern configuration (Argon2id). Built once; hashing is stateless.
_password_hash = PasswordHash.recommended()

# Bytes of entropy for a raw session token before URL-safe encoding.
_TOKEN_BYTES = 32


class PwdlibHasher:
    """PasswordHasher port backed by pwdlib (Argon2id)."""

    def hash(self, password: str) -> str:
        return _password_hash.hash(password)

    def verify(self, password: str, password_hash: str) -> bool:
        return _password_hash.verify(password, password_hash)


class SecretsTokenGenerator:
    """TokenGenerator port: cryptographically-random tokens, SHA-256 at rest."""

    def generate(self) -> str:
        return secrets.token_urlsafe(_TOKEN_BYTES)

    def hash_token(self, raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
