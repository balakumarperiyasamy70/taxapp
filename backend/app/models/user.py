from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class LanguageEnum(str, enum.Enum):
    en = "en"
    es = "es"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    ssn_encrypted = Column(String)          # AES-encrypted SSN
    dob = Column(String)                    # stored as YYYY-MM-DD string
    language = Column(Enum(LanguageEnum), default=LanguageEnum.en)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)   # identity verified
    mfa_secret = Column(String)                    # TOTP secret (encrypted)
    mfa_enabled = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
