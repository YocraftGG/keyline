import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, status

from database.token_db import TokenDB
from database.user_db import UserDB
from logs.setup_logger import logger
from schemas.auth import LoginRequest, RegistrationResponse, TokenResponse
from schemas.user import UserCreate, UserRead
from services.auth_service import (
    create_access_token,
    hash_password,
    send_welcome_email,
    verify_password,
)
from services.auth_dependency import get_current_user


router = APIRouter()
user_db = UserDB()
token_db = TokenDB()


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegistrationResponse)
def register(user: UserCreate):
    user_data = user.model_dump(exclude={"password"})
    user_data["password_hash"] = hash_password(user.password)

    try:
        created_user = user_db.create_user(user_data)
    except mysql.connector.errors.IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email is already registered")
    except mysql.connector.errors.Error:
        logger.exception("Could not register user")
        raise HTTPException(status_code=500, detail="Could not register user")

    try:
        email_sent = send_welcome_email(created_user["email"], created_user["username"])
    except Exception:
        logger.exception("Account created, but welcome email could not be sent")
        email_sent = False

    return {"user": created_user, "email_sent": email_sent}


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    user = user_db.get_user_by_email(str(credentials.email))
    if user is None or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: dict = Depends(get_current_user)):
    token_db.revoke(current_user["_token_id"], current_user["_token_expires_at"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
