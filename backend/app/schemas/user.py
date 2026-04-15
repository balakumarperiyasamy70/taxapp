from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    language: str = "en"


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    mfa_code: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    language: str
    is_verified: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class IdentityVerify(BaseModel):
    ssn: str        # will be encrypted before storage
    dob: str        # YYYY-MM-DD
    kba_answers: dict   # question_id -> answer
