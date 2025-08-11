from typing import Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from firebase_admin import auth as firebase_auth

from app.services.database import initialize_firebase


class AuthMiddleware(BaseHTTPMiddleware):
    """Global authentication middleware for verifying Firebase ID tokens.

    - Skips OPTIONS and documentation routes
    - Verifies token and email verification
    - Attaches decoded claims to request.state.user
    """

    def __init__(self, app, public_paths: Optional[Set[str]] = None):
        super().__init__(app)
        self.public_paths: Set[str] = public_paths or {"/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Allow CORS preflight and docs without auth
        if request.method == "OPTIONS" or request.url.path in self.public_paths:
            return await call_next(request)

        authorization = request.headers.get("Authorization")
        if not authorization or " " not in authorization:
            return JSONResponse(status_code=401, content={"detail": "Missing Authorization header"})

        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer" or not token:
            return JSONResponse(status_code=401, content={"detail": "Invalid Authorization scheme"})

        try:
            initialize_firebase()
            decoded = firebase_auth.verify_id_token(token)
            if not decoded.get("email_verified", False):
                return JSONResponse(status_code=403, content={"detail": "Email not verified"})
            request.state.user = decoded
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        return await call_next(request)

