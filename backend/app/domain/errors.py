"""Domain-level errors, independent of any web framework.

The API layer maps these to HTTP status codes (see app/api/errors.py):
  NotFoundError        -> 404
  ConflictError        -> 409
  ValidationError      -> 422
  ProtectedResourceError -> 409
"""


class DomainError(Exception):
    """Base class for all domain errors."""


class NotFoundError(DomainError):
    """A requested entity does not exist."""


class ConflictError(DomainError):
    """A uniqueness / state conflict (e.g. duplicate slug)."""


class ValidationError(DomainError):
    """An invariant was violated (e.g. cross-project domain, bad scope)."""


class ProtectedResourceError(DomainError):
    """A protected resource cannot be mutated (e.g. the default artifact type)."""
