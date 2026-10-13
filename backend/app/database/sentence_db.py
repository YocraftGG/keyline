from collections import Counter
import random

import requests

from database.db_connection import DB_connection
from database.test_db import TestDB


class SentenceDB:
    @staticmethod
    def create_sentence(data):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            INSERT INTO keyline_db.sentences 
            (text, difficulty, category)
            VALUES (%s, %s, %s)
            """
        values = (
            data["text"], 
            data["difficulty"], 
            data["category"]
        )

        cursor.execute(sql, values)
        conn.commit()
        
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return SentenceDB.get_sentence_by_id(new_id)
    

    @staticmethod
    def get_all_sentences():
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM keyline_db.sentences")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return rows


    @staticmethod
    def get_sentence_by_id(id):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM keyline_db.sentences WHERE id = %s", (id,))
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        return row


    @staticmethod
    def get_random_sentence(difficulty, category):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM keyline_db.sentences"
        conditions = []
        values = []

        if difficulty:
            conditions.append("difficulty = %s")
            values.append(difficulty)
        if category:
            conditions.append("category = %s")
            values.append(category)
        else:
            # Adaptive passages are generated for a specific user's practice.
            # Keep them out of the general random pool.
            conditions.append("(category IS NULL OR category <> %s)")
            values.append("adaptive")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY RAND() LIMIT 1;"

        cursor.execute(query, tuple(values))
        
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return row


    @staticmethod
    def get_adaptive_sentence(difficulty, user_id):
        difficulty_value = getattr(difficulty, "value", difficulty)
        tests = TestDB.get_tests_by_user(user_id, difficulty=difficulty_value)[:5]
        merged_counter = Counter()
        for test in tests:
            counts = test.get("mistake_counts") or {}
            merged_counter.update({key.casefold(): value for key, value in counts.items()})

        focus_character = merged_counter.most_common(1)
        if not focus_character:
            return SentenceDB.get_random_sentence(difficulty, None)

        character = max(
            merged_counter,
            key=lambda key: (merged_counter[key], len(key)),
        )
        result_limits = {"easy": 100, "medium": 100, "hard": 100}
        passage_word_counts = {"easy": 5, "medium": 7, "hard": 9}
        max_word_lengths = {"easy": 6, "medium": 8, "hard": 12}
        result_limit = result_limits[difficulty_value]
        try:
            response = requests.get(
                "https://api.datamuse.com/words",
                params={"sp": f"*{character}*", "max": result_limit, "md": "f"},
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
            word_frequencies = {}
            for item in data if isinstance(data, list) else []:
                if not isinstance(item, dict):
                    continue
                word = item.get("word", "")
                if (
                    isinstance(word, str)
                    and word.isalpha()
                    and len(word) <= max_word_lengths[difficulty_value]
                    and character in word.casefold()
                    and word.casefold() not in word_frequencies
                ):
                    frequency = 0.0
                    for tag in item.get("tags") or []:
                        if isinstance(tag, str) and tag.startswith("f:"):
                            try:
                                frequency = float(tag[2:])
                            except ValueError:
                                pass
                            break
                    word_frequencies[word.lower()] = frequency
        except (requests.RequestException, ValueError):
            word_frequencies = {}

        # More common words are generally easier to recognize. Randomize among
        # the strongest matches so repeated adaptive tests still vary.
        ranked_words = sorted(word_frequencies, key=word_frequencies.get, reverse=True)[:30]
        words = ranked_words
        if not words:
            return SentenceDB.get_random_sentence(difficulty, None)

        selected_words = random.sample(words, min(passage_word_counts[difficulty_value], len(words)))
        text = " ".join(selected_words).capitalize() + "."
        sentence = SentenceDB.create_sentence(
            {"text": text, "difficulty": difficulty, "category": "adaptive"}
        )
        sentence["focus_characters"] = [character]
        return sentence


    @staticmethod
    def update_sentence(id, data):
        conn = DB_connection.get_connection()
        cursor = conn.cursor()

        set_clause = ", ".join(f"{key} = %s" for key in data.keys())
        
        cursor.execute(
            f"UPDATE keyline_db.sentences SET {set_clause} WHERE id = %s",
            list(data.values()) + [id]
        )
        conn.commit()

        updated = cursor.rowcount > 0
        
        cursor.close()
        conn.close()
        return updated 
