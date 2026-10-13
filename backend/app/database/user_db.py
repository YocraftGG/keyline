from datetime import timedelta

from database.db_connection import DB_connection


class UserDB:
    @staticmethod
    def create_user(data):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            INSERT INTO keyline_db.users 
            (username, email, password_hash)
            VALUES (%s, %s, %s)
            """
        values = (
            data["username"], 
            data["email"], 
            data["password_hash"]
        )

        cursor.execute(sql, values)
        conn.commit()
        
        new_id = cursor.lastrowid

        cursor.close()
        conn.close()
        return UserDB.get_user_by_id(new_id)
    

    @staticmethod
    def get_all_users():
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, username, email, created_at FROM keyline_db.users"
        )
        rows = cursor.fetchall()

        cursor.close()
        conn.close()
        return rows


    @staticmethod
    def get_user_by_id(id):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, username, email, created_at FROM keyline_db.users WHERE id = %s",
            (id,),
        )
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        return row


    @staticmethod
    def get_user_by_email(email):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM keyline_db.users WHERE email = %s", (email,))
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        return row


    @staticmethod
    def get_user_tests(id):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM keyline_db.tests WHERE user_id = %s", (id,))
        tests = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return tests


    @staticmethod
    def get_user_stats(id, difficulty=None):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """
                SELECT COUNT(*) AS tests_completed, AVG(wpm) AS average_wpm,
                       MAX(wpm) AS best_wpm, AVG(accuracy) AS average_accuracy,
                       COALESCE(SUM(duration), 0) AS total_duration_seconds
                FROM keyline_db.tests AS t
                JOIN keyline_db.sentences AS s ON s.id = t.sentence_id
                WHERE t.user_id = %s AND (%s IS NULL OR s.difficulty = %s)
                """, (id, difficulty, difficulty)
            )
            stats = cursor.fetchone()

            cursor.execute(
                "SELECT t.wpm FROM keyline_db.tests AS t "
                "JOIN keyline_db.sentences AS s ON s.id = t.sentence_id "
                "WHERE t.user_id = %s AND (%s IS NULL OR s.difficulty = %s) "
                "ORDER BY t.created_at DESC, t.id DESC LIMIT 10",
                (id, difficulty, difficulty)
            )
            recent_wpms = [row["wpm"] for row in cursor.fetchall()]
            stats["average_last_10_wpm"] = (
                sum(recent_wpms) / len(recent_wpms) if recent_wpms else None
            )

            cursor.execute(
                "SELECT DISTINCT DATE(t.created_at) AS practice_day "
                "FROM keyline_db.tests AS t "
                "JOIN keyline_db.sentences AS s ON s.id = t.sentence_id "
                "WHERE t.user_id = %s AND (%s IS NULL OR s.difficulty = %s) "
                "ORDER BY practice_day DESC", (id, difficulty, difficulty)
            )
            practice_days = [row["practice_day"] for row in cursor.fetchall()]
            stats["practiced_days"] = len(practice_days)

            cursor.execute("SELECT CURRENT_DATE() AS today")
            today = cursor.fetchone()["today"]
            day_set = set(practice_days)
            streak = 0
            if today in day_set:
                anchor = today
            elif today - timedelta(days=1) in day_set:
                anchor = today - timedelta(days=1)
            else:
                anchor = None
            if anchor is not None:
                while anchor in day_set:
                    streak += 1
                    anchor -= timedelta(days=1)
            stats["current_streak_days"] = streak

            longest_streak = 0
            previous = None
            run = 0
            for practice_day in sorted(day_set):
                run = run + 1 if previous and (practice_day - previous).days == 1 else 1
                longest_streak = max(longest_streak, run)
                previous = practice_day
            stats["longest_streak_days"] = longest_streak
            return stats
        finally:
            cursor.close()
            conn.close()


    @staticmethod
    def get_leaderboard(limit=50, difficulty=None):
        conn = DB_connection.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """
                SELECT u.username, COUNT(t.id) AS tests_completed,
                       AVG(t.wpm) AS average_wpm, MAX(t.wpm) AS best_wpm
                FROM keyline_db.users AS u
                JOIN keyline_db.tests AS t ON t.user_id = u.id
                JOIN keyline_db.sentences AS s ON s.id = t.sentence_id
                WHERE (%s IS NULL OR s.difficulty = %s)
                GROUP BY u.id, u.username
                ORDER BY average_wpm DESC, tests_completed DESC, u.username ASC
                LIMIT %s
                """, (difficulty, difficulty, limit)
            )
            rows = cursor.fetchall()
            for rank, row in enumerate(rows, start=1):
                row["rank"] = rank
            return rows
        finally:
            cursor.close()
            conn.close()


    @staticmethod
    def update_user(id, data):
        conn = DB_connection.get_connection()
        cursor = conn.cursor()

        set_clause = ", ".join(f"{key} = %s" for key in data.keys())
        
        cursor.execute(
            f"UPDATE keyline_db.users SET {set_clause} WHERE id = %s",
            list(data.values()) + [id]
        )
        conn.commit()

        updated = cursor.rowcount > 0
        
        cursor.close()
        conn.close()
        return updated


    @staticmethod
    def delete_user_and_tests(user_id):
        conn = DB_connection.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM keyline_db.tests WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM keyline_db.users WHERE id = %s", (user_id,))
            deleted = cursor.rowcount == 1
            conn.commit()
            return deleted
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
