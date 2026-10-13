import os
import uuid
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash
from email.message import EmailMessage
import smtplib


PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        secret,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> dict:
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not configured")
    return jwt.decode(token, secret, algorithms=["HS256"])


def send_welcome_email(email: str, username: str) -> bool:
    """Send a welcome email through Gmail SMTP; never send the user's password."""
    EMAIL_PASS = os.environ.get("EMAIL_PASS")
    EMAIL_USER = os.environ.get("EMAIL_USER")

    msg = EmailMessage()
    msg['Subject'] = 'Welcome to Keyline'
    msg['From'] = EMAIL_USER
    msg['To'] = email
    msg.set_content(
        'Your account is ready. You can now sign in with the password you chose during registration.'
    )
    msg.add_alternative(
        f"<p>Hi {escape(username)},</p>"
        "<p>Your account is ready. You can now sign in with the password "
        "you chose during registration.</p>",
    subtype='html',
    )

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(msg)
    except Exception as error:
        detail = f"Failed to send email {error}"
        raise RuntimeError(detail) from None
    return True
