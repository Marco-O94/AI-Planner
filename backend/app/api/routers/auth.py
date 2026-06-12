"""Authentication endpoints: register, login, logout, me.

Login/register are public (mounted without the require_auth guard); logout/me are
guarded at the route level. Sessions ride in an httpOnly cookie.
"""

from fastapi import APIRouter, Depends, Request, Response

from app.api.deps import Principal, get_auth_service, require_auth
from app.api.rate_limit import limiter
from app.application.auth_service import AuthService
from app.config import settings
from app.domain.errors import AuthenticationError
from app.schemas.auth import LoginRequest, RegisterRequest, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=201)
@limiter.limit(settings.rate_limit_register)
def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> UserRead:
    user = service.register(payload.email, payload.password)
    _set_session_cookie(response, service.issue_session(user))
    return UserRead.model_validate(user)


@router.post("/login", response_model=UserRead)
@limiter.limit(settings.rate_limit_login)
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> UserRead:
    user, token = service.login(payload.email, payload.password)
    _set_session_cookie(response, token)
    return UserRead.model_validate(user)


@router.post("/logout", status_code=204, dependencies=[Depends(require_auth)])
def logout(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        service.logout(token)
    # Deletion must echo the attributes the cookie was set with, or the browser
    # treats it as a different cookie and keeps the original.
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )


@router.get("/me", response_model=UserRead)
def me(
    principal: Principal = Depends(require_auth),
    service: AuthService = Depends(get_auth_service),
) -> UserRead:
    if principal.is_service or principal.user_id is None:
        raise AuthenticationError("not a user session")
    return UserRead.model_validate(service.get_user(principal.user_id))
