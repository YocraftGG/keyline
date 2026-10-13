from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from database.test_db import TestDB
from database.sentence_db import SentenceDB
from schemas.test import TestCreate, TestRead
from services.auth_dependency import get_current_user


router = APIRouter()
test_db = TestDB()
sentence_db = SentenceDB()


@router.post("", status_code=201, response_model=TestRead)
def create_test(body: TestCreate, current_user: dict = Depends(get_current_user)):
    sentence = sentence_db.get_sentence_by_id(body.sentence_id)
    if sentence is None:
        raise HTTPException(status_code=404, detail="sentence not found")

    passage_characters = {character.casefold() for character in sentence["text"] if character.isalpha()}
    invalid_characters = {
        character for character in body.mistake_counts
        if any(letter not in passage_characters for letter in character.casefold())
    }
    if invalid_characters:
        raise HTTPException(
            status_code=422,
            detail="mistake_counts may only include letters present in the passage",
        )
    single_letter_mistakes = sum(
        count for character, count in body.mistake_counts.items()
        if len(character) == 1
    )
    if single_letter_mistakes > body.errors:
        raise HTTPException(
            status_code=422,
            detail="mistake_counts total cannot exceed the reported error count",
        )

    test_data = body.model_dump()
    test_data["user_id"] = current_user["id"]
    return test_db.create_test(test_data)


@router.get("", response_model=list[TestRead])
def get_tests(
    difficulty: Literal["easy", "medium", "hard"] | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    return test_db.get_tests_by_user(current_user["id"], difficulty=difficulty)


@router.get("/{id}", response_model=TestRead)
def get_test(id: int, current_user: dict = Depends(get_current_user)):
    test = test_db.get_test_by_id(id, current_user["id"])
    if test is None:
        raise HTTPException(status_code=404, detail="test not found")
    return test
