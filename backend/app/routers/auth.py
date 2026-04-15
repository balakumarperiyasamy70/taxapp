from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut
from app.models.user import User
from app.utils.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token
)
import pyotp

router = APIRouter()


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


@router.post("/mfa/setup")
def setup_mfa():
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    return {
        "secret": secret,
        "provisioning_uri": totp.provisioning_uri("user@taxrefundloan.us", issuer_name="TaxRefundLoan"),
    }
