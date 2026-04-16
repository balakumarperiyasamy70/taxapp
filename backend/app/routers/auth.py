from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut
from app.models.user import User
from app.utils.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token
)
from app.utils.email import send_password_reset_email
import pyotp
import secrets
from datetime import datetime, timezone, timedelta

router = APIRouter()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        language=data.language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    if user.mfa_enabled:
        if not data.mfa_code:
            raise HTTPException(status_code=401, detail="MFA code required")
        from app.utils.security import decrypt_field
        secret = decrypt_field(user.mfa_secret)
        totp = pyotp.TOTP(secret)
        if not totp.verify(data.mfa_code):
            raise HTTPException(status_code=401, detail="Invalid MFA code")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "language": user.language,
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    # Always return success — don't reveal whether email exists
    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        try:
            send_password_reset_email(user.email, token)
        except Exception:
            pass  # Don't expose SMTP errors to caller
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if datetime.now(timezone.utc) > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset link has expired")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/mfa/setup")
def setup_mfa():
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    return {
        "secret": secret,
        "provisioning_uri": totp.provisioning_uri("user@taxrefundloan.us", issuer_name="TaxRefundLoan"),
    }
