from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Request, status
from firebase_admin import auth as firebase_auth

from app.utils.logger import get_logger
from app.services.database import initialize_firebase

logger = get_logger(__name__)


def _extract_bearer_token(request: Request) -> str:
    authorization: Optional[str] = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header format")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization scheme")

    return token


async def get_current_user(request: Request) -> Dict[str, Any]:
    """Verify Firebase ID token and return user claims (uid, email, email_verified, name)."""
    token = _extract_bearer_token(request)
    print(f"token: ", token)
    try:
        # Ensure Admin SDK is initialized
        initialize_firebase()
        decoded = firebase_auth.verify_id_token(token)
        uid = decoded.get("uid")
        email = decoded.get("email")
        email_verified = decoded.get("email_verified", False)
        name = decoded.get("name")

        if not uid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: missing uid")

        user_info = {"uid": uid, "email": email, "email_verified": email_verified, "name": name}
        return user_info
    except Exception as ex:
        logger.error(f"Failed to verify Firebase token: {ex}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


async def get_verified_user(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependency that requires email to be verified."""
    if not user.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
    return user

