from typing import Literal

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from database.user_db import UserDB
from schemas.auth import PasswordChange, PasswordConfirmation
from services.auth_dependency import get_current_user
from services.auth_service import hash_password, verify_password
from schemas.user import LeaderboardEntry, UserRead, UsernameUpdate


router = APIRouter()
user_db = UserDB()


@router.get("", response_model=list[UserRead])
def get_all_users():
    return user_db.get_all_users()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(difficulty: Literal["easy", "medium", "hard"] | None = Query(default=None)):
    return user_db.get_leaderboard(difficulty=difficulty)


@router.get("/me/stats")
def get_my_stats(
    difficulty: Literal["easy", "medium", "hard"] | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return user_db.get_user_stats(current_user["id"], difficulty=difficulty)


@router.patch("/me", response_model=UserRead)
def update_my_account(
    update: UsernameUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_db.update_user(current_user["id"], {"username": update.username})
    except mysql.connector.errors.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken",
        ) from None

    updated_user = user_db.get_user_by_id(current_user["id"])
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    passwords: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
    user = user_db.get_user_by_email(current_user["email"])
    if user is None or not verify_password(passwords.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Current password is incorrect")
    if verify_password(passwords.new_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a different password")

    user_db.update_user(current_user["id"], {"password_hash": hash_password(passwords.new_password)})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    confirmation: PasswordConfirmation,
    current_user: dict = Depends(get_current_user),
):
    user_with_hash = user_db.get_user_by_email(current_user["email"])
    if user_with_hash is None or not verify_password(
        confirmation.password, user_with_hash["password_hash"]
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password")

    deleted = user_db.delete_user_and_tests(current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
