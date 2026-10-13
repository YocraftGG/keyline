import json
from pathlib import Path

from database.db_connection import DB_connection


SEED_FILE = Path(__file__).parent / "seed_data" / "sentences.json"
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def load_sentences():
    with SEED_FILE.open(encoding="utf-8") as seed_file:
        sentences = json.load(seed_file)

    if not isinstance(sentences, list):
        raise ValueError("Sentence seed data must be a JSON list")

    for index, sentence in enumerate(sentences, start=1):
        if not isinstance(sentence, dict):
            raise ValueError(f"Sentence #{index} must be a JSON object")
        if not isinstance(sentence.get("text"), str) or not sentence["text"].strip():
            raise ValueError(f"Sentence #{index} must have non-empty text")
        if sentence.get("difficulty") not in VALID_DIFFICULTIES:
            raise ValueError(f"Sentence #{index} has an invalid difficulty")
        category = sentence.get("category")
        if category is not None and (not isinstance(category, str) or len(category) > 50):
            raise ValueError(f"Sentence #{index} category must be at most 50 characters")

    return sentences


def seed_sentences():
    sentences = load_sentences()
    DB_connection.create_database()
    DB_connection.create_tables()

    conn = DB_connection.get_connection()
    cursor = conn.cursor()
    inserted = 0
    try:
        for sentence in sentences:
            cursor.execute(
                "SELECT id FROM keyline_db.sentences "
                "WHERE BINARY text = BINARY %s LIMIT 1",
                (sentence["text"],),
            )
            if cursor.fetchone() is not None:
                continue

            cursor.execute(
                """
                INSERT INTO keyline_db.sentences (text, difficulty, category)
                VALUES (%s, %s, %s)
                """,
                (sentence["text"], sentence["difficulty"], sentence.get("category")),
            )
            inserted += 1

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

    print(f"Seeded {inserted} new sentence(s); existing passages were skipped.")


if __name__ == "__main__":
    seed_sentences()
