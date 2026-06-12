"""Outbound ports for security primitives (Protocols).

The application layer depends on these abstractions so concrete crypto libraries
(pwdlib, secrets) live only in the infrastructure layer — keeping the dependency
rule ``application -> domain`` intact.
"""

from __future__ import annotations

from typing import Protocol


class PasswordHasher(Protocol):
    """Hashes and verifies user passwords (e.g. Argon2id)."""

    def hash(self, password: str) -> str: ...
    def verify(self, password: str, password_hash: str) -> bool: ...


class TokenGenerator(Protocol):
    """Generates opaque session tokens and derives the value stored at rest.

    ``generate`` returns the raw token handed to the client (cookie); ``hash_token``
    derives the deterministic digest persisted in the ``sessions`` table, so a DB
    dump never exposes live tokens.
    """

    def generate(self) -> str: ...
    def hash_token(self, raw_token: str) -> str: ...
