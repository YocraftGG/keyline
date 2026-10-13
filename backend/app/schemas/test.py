from datetime import datetime
from decimal import Decimal
from math import ceil

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TestBase(BaseModel):
    """Fields stored for each typing test."""

    sentence_id: int = Field(ge=1)
    wpm: int = Field(ge=0, le=300)
    accuracy: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    characters: int = Field(ge=1, le=100_000)
    # Mistakes count incorrect attempts, including ones later corrected, so
    # they are intentionally not limited to the final character count.
    errors: int = Field(ge=0, le=100_000)
    duration: int = Field(ge=1, le=86_400)
    mistake_counts: dict[str, int] = Field(default_factory=dict, max_length=100)

    @field_validator("mistake_counts")
    @classmethod
    def validate_mistake_counts(cls, counts):
        for character, count in counts.items():
            if not 1 <= len(character) <= 2 or not character.isalpha():
                raise ValueError("mistake count keys must be one letter or a two-letter pattern")
            if count < 1 or count > 100_000:
                raise ValueError("mistake counts must be between 1 and 100000")
        return counts

    @model_validator(mode="after")
    def wpm_must_fit_character_and_time_counts(self):
        max_supported_wpm = ceil(self.characters * 12 / self.duration)
        if self.wpm > max_supported_wpm:
            raise ValueError("WPM is too high for the reported characters and duration")
        return self


class TestCreate(TestBase):
    model_config = ConfigDict(extra="forbid")


class TestRead(TestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
