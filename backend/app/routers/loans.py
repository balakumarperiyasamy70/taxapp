from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.loan import LoanApplication, LoanOut
from app.models.loan import Loan, LoanStatus
from app.models.tax_return import TaxReturn, ReturnStatus
from app.routers.users import get_current_user
from app.models.user import User
from app.utils.security import encrypt_field

router = APIRouter()

MAX_LOAN_CENTS = 400000  # $4,000


@router.post("/apply", response_model=LoanOut)
def apply_loan(
    data: LoanApplication,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")

    tax_return = db.query(TaxReturn).filter(
        TaxReturn.id == data.tax_return_id,
        TaxReturn.user_id == current_user.id,
    ).first()
    if not tax_return:
        raise HTTPException(status_code=404, detail="Tax return not found")
    if tax_return.status not in (ReturnStatus.submitted, ReturnStatus.accepted):
        raise HTTPException(status_code=400, detail="Tax return must be submitted first")

    requested_cents = int(data.requested_amount * 100)
    if requested_cents > MAX_LOAN_CENTS:
        raise HTTPException(status_code=400, detail="Maximum loan amount is $4,000")
    if requested_cents > tax_return.refund_amount_cents:
        raise HTTPException(status_code=400, detail="Loan cannot exceed refund amount")

    loan = Loan(
        user_id=current_user.id,
        tax_return_id=data.tax_return_id,
        requested_amount_cents=requested_cents,
        bank_routing=encrypt_field(data.bank_routing),
        bank_account=encrypt_field(data.bank_account),
        status=LoanStatus.pending,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.get("/", response_model=list[LoanOut])
def list_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Loan).filter(Loan.user_id == current_user.id).all()
