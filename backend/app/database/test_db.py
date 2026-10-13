import json

from database.db_connection import DB_connection


class TestDB:
    @staticmethod
    def create_test(data):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            INSERT INTO keyline_db.tests 
            (user_id, sentence_id, wpm, accuracy, 
            characters, errors, duration, mistake_counts)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
        values = (
            data["user_id"], 
            data["sentence_id"], 
            data["wpm"], 
            data["accuracy"], 
            data["characters"], 
            data["errors"],
            data["duration"],
            json.dumps(data.get("mistake_counts", {})),
        )

        cursor.execute(sql, values)
        conn.commit()
        
        new_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        return TestDB.get_test_by_id(new_id, data["user_id"])
    

    @staticmethod
    def get_tests_by_user(user_id, difficulty=None):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT t.* FROM keyline_db.tests AS t
            JOIN keyline_db.sentences AS s ON s.id = t.sentence_id
            WHERE t.user_id = %s AND (%s IS NULL OR s.difficulty = %s)
            ORDER BY t.created_at DESC, t.id DESC
            """,
            (user_id, difficulty, difficulty),
        )
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        for row in rows:
            row["mistake_counts"] = TestDB._decode_mistake_counts(row.get("mistake_counts"))
        return rows


    @staticmethod
    def get_test_by_id(id, user_id):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT * FROM keyline_db.tests WHERE id = %s AND user_id = %s",
            (id, user_id),
        )
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        if row is not None:
            row["mistake_counts"] = TestDB._decode_mistake_counts(row.get("mistake_counts"))
        return row

    @staticmethod
    def _decode_mistake_counts(value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {}
        return value if isinstance(value, dict) else {}
