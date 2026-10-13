from datetime import datetime, timezone

from database.db_connection import DB_connection


class TokenDB:
    @staticmethod
    def is_revoked(token_id: str) -> bool:
        conn = DB_connection.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM keyline_db.revoked_tokens WHERE token_id = %s LIMIT 1",
                (token_id,),
            )
            return cursor.fetchone() is not None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def revoke(token_id: str, expires_at: int) -> None:
        conn = DB_connection.get_connection()
        cursor = conn.cursor()
        expires = datetime.fromtimestamp(expires_at, timezone.utc).replace(tzinfo=None)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        try:
            cursor.execute(
                "DELETE FROM keyline_db.revoked_tokens WHERE expires_at <= %s",
                (now,),
            )
            cursor.execute(
                "INSERT INTO keyline_db.revoked_tokens (token_id, expires_at) VALUES (%s, %s)",
                (token_id, expires),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()
