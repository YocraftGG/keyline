import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

class DB_connection:
    @staticmethod
    def get_connection():
        """Returns an active MySQL connection"""
        return mysql.connector.connect(
            host=os.environ["DB_HOST"],
            port=int(os.environ["DB_PORT"]),
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
        )


    @staticmethod
    def create_database():
        """Creates Intelligence_db if it does not exist"""
        conn = DB_connection.get_connection()
        cursor = conn.cursor()

        cursor.execute("CREATE DATABASE IF NOT EXISTS keyline_db")
        conn.commit()

        cursor.close()
        conn.close()
    

    @staticmethod
    def create_tables():
        conn = DB_connection.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS keyline_db.users(
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS keyline_db.sentences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                text TEXT NOT NULL,
                difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
                category VARCHAR(50)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS keyline_db.tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sentence_id INT NOT NULL,
                wpm INT NOT NULL,
                accuracy DECIMAL(5,2) NOT NULL,
                characters INT NOT NULL,
                errors INT NOT NULL,
                duration INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                mistake_counts JSON,

                FOREIGN KEY (user_id) REFERENCES keyline_db.users(id),
                FOREIGN KEY (sentence_id) REFERENCES keyline_db.sentences(id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS keyline_db.revoked_tokens (
                token_id VARCHAR(36) PRIMARY KEY,
                expires_at DATETIME NOT NULL
            )
            """
        )
        conn.commit()

        cursor.close()
        conn.close()
