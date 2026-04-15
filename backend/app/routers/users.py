from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserOut, IdentityVerify
from app.models.user import User
from app.utils.security import encrypt_field, decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-identity")
def verify_identity(
    data: IdentityVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.ssn_encrypted = encrypt_field(data.ssn)
    current_user.dob = data.dob
    current_user.is_verified = True
    db.commit()
    return {"verified": True}


@router.put("/language/{lang}")
def set_language(
    lang: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if lang not in ("en", "es"):
        raise HTTPException(status_code=400, detail="Supported: en, es")
    current_user.language = lang
    db.commit()
    return {"language": lang}
