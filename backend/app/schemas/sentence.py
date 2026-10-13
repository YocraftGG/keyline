from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class SentenceBase(BaseModel):
    """Fields stored for each typing sentence."""

    text: str
    difficulty: Difficulty
    category: str | None = Field(default=None, max_length=50)


class SentenceCreate(SentenceBase):
    pass


class SentenceUpdate(BaseModel):
    text: str = None
    difficulty: Difficulty = None
    category: str | None = Field(default=None, max_length=50)


class SentenceRead(SentenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class AdaptiveSentenceRead(SentenceRead):
    focus_characters: list[str] = Field(default_factory=list)
