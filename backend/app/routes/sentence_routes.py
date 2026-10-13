from fastapi import APIRouter, HTTPException, Query, Depends
import mysql.connector

from database.sentence_db import SentenceDB
from logs.setup_logger import logger
from schemas.sentence import AdaptiveSentenceRead, Difficulty, SentenceCreate, SentenceRead, SentenceUpdate

from services.auth_dependency import get_current_user

sentence_db = SentenceDB()
router = APIRouter()


# @router.post("", status_code=201, response_model=SentenceRead)
# def create_sentence(body: SentenceCreate):
#     logger.info("POST /sentences called")
#     try:
#         logger.info("Creating sentence")
#         sentence = sentence_db.create_sentence(body.model_dump())
#         logger.info("sentence created successfully: id=%s", sentence["id"])
#         return sentence
#     except mysql.connector.errors.Error as e:
#         logger.error("Failed to create sentence: %s", e)
#         raise HTTPException(status_code=400, detail="Could not create sentence")
    

@router.get("", response_model=list[SentenceRead])
def get_all_sentence():
    logger.info("GET /sentences called")
    logger.info("Getting sentences")
    sentences = sentence_db.get_all_sentences()
    logger.info("Got sentences successfully")
    return sentences


@router.get("/random", response_model=SentenceRead)
def get_random_sentence(
    difficulty: Difficulty | None = Query(None),
    category: str | None = Query(None),
):
    logger.info("GET /sentences/random called with difficulty=%s, category=%s", difficulty, category)
    logger.info("Getting sentence")
    sentence = sentence_db.get_random_sentence(difficulty, category)
    if sentence is None:
        logger.error("No sentence found matching criteria")
        raise HTTPException(status_code=404, detail="sentence not found")
    logger.info("Got random sentence successfully")
    return sentence


@router.get("/adaptive", response_model=AdaptiveSentenceRead)
def get_adaptive_sentence(
    difficulty: Difficulty,
    current_user: dict = Depends(get_current_user),
):
    logger.info("GET /sentences/adaptive called with difficulty=%s", difficulty)
    logger.info("Getting sentence")
    sentence = sentence_db.get_adaptive_sentence(difficulty, current_user["id"])
    if sentence is None:
        logger.error("No sentence found matching criteria")
        raise HTTPException(status_code=404, detail="sentence not found")
    logger.info("Got adaptive sentence successfully")
    return sentence


@router.get("/{id}", response_model=SentenceRead)
def get_sentence(id: int):
    logger.info("GET /sentences/{id} called")
    logger.info("Getting sentence with id %s", id)
    sentence = sentence_db.get_sentence_by_id(id)
    if sentence is None:
        logger.error("sentence not found: %s", id)
        raise HTTPException(status_code=404, detail="sentence not found")
    logger.info("Got sentence with id %s successfully", id)
    return sentence
