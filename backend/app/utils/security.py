import base64
import os
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_fernet() -> Fernet:
    key = settings.encryption_key.encode()
    # Ensure key is valid Fernet key (32 url-safe base64 bytes)
    return Fernet(key)


def encrypt_field(value: str) -> str:
    """Encrypt sensitive fields like SSN."""
    f = get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_field(token: str) -> str:
    """Decrypt sensitive fields."""
    f = get_fernet()
    return f.decrypt(token.encode()).decode()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {**data, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {**data, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
