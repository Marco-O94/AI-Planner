"""Shared rate limiter (slowapi).

A single ``Limiter`` instance the auth router decorates and ``main`` registers.
Keyed by client IP; in-memory storage (single backend process). Tests disable it
via ``limiter.enabled = False`` so they can hammer the auth endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
