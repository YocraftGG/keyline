from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    """Fields required to create a row in ``users``."""

    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Username cannot be blank")
        return value


class UserUpdate(BaseModel):
    username: str = Field(default=None, max_length=50)
    email: EmailStr = None
    password : str = Field(default=None, min_length=8, max_length=128)


class UsernameUpdate(BaseModel):
    username: str = Field(min_length=1, max_length=50)

    @field_validator("username")
    @classmethod
    def username_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Username cannot be blank")
        return value


class UserRead(BaseModel):
    """Public user fields returned by the database (never the password hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str = Field(max_length=50)
    email: EmailStr
    created_at: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    tests_completed: int
    average_wpm: float
    best_wpm: int
