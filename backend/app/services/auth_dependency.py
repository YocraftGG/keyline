import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database.token_db import TokenDB
from database.user_db import UserDB
from services.auth_service import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)
user_db = UserDB()
token_db = TokenDB()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        claims = decode_access_token(credentials.credentials)
        user_id = int(claims["sub"])
        token_id = claims["jti"]
        expires_at = int(claims["exp"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized

    if token_db.is_revoked(token_id):
        raise unauthorized

    user = user_db.get_user_by_id(user_id)
    if user is None:
        raise unauthorized

    user["_token_id"] = token_id
    user["_token_expires_at"] = expires_at
    return user
