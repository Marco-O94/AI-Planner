"""Map domain errors (and DB integrity errors) to HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.domain.errors import (
    ConflictError,
    NotFoundError,
    ProtectedResourceError,
    ValidationError,
)


def _json(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": message})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return _json(404, str(exc))

    @app.exception_handler(ValidationError)
    async def _validation(_: Request, exc: ValidationError) -> JSONResponse:
        return _json(422, str(exc))

    @app.exception_handler(ConflictError)
    async def _conflict(_: Request, exc: ConflictError) -> JSONResponse:
        return _json(409, str(exc))

    @app.exception_handler(ProtectedResourceError)
    async def _protected(_: Request, exc: ProtectedResourceError) -> JSONResponse:
        return _json(409, str(exc))

    @app.exception_handler(IntegrityError)
    async def _integrity(_: Request, exc: IntegrityError) -> JSONResponse:
        return _json(409, "the operation conflicts with an existing record")
