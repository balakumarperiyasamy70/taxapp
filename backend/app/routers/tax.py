from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.tax import Form4868, Form1040, TaxReturnOut
from app.models.tax_return import TaxReturn, ReturnType, ReturnStatus
from app.routers.users import get_current_user
from app.models.user import User
from app.services import tax_service, irs_efile
import json

router = APIRouter()


@router.post("/extension/4868", response_model=TaxReturnOut)
def file_extension(
    data: Form4868,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")

    tax_return = TaxReturn(
        user_id=current_user.id,
        tax_year=data.tax_year,
        return_type=ReturnType.extension_4868,
        status=ReturnStatus.draft,
        estimated_tax_cents=int(data.estimated_tax * 100),
        tax_owed_cents=int(data.balance_due * 100),
        form_data=json.dumps(data.model_dump()),
    )
    db.add(tax_return)
    db.commit()
    db.refresh(tax_return)

    result = irs_efile.submit_4868(tax_return, data)
    tax_return.submission_id = result.get("submission_id")
    tax_return.status = ReturnStatus.submitted
    db.commit()
    db.refresh(tax_return)
    return tax_return


@router.post("/1040", response_model=TaxReturnOut)
def file_1040(
    data: Form1040,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")

    calc = tax_service.calculate_1040(data)
    tax_return = TaxReturn(
        user_id=current_user.id,
        tax_year=data.tax_year,
        return_type=ReturnType.individual_1040,
        status=ReturnStatus.draft,
        total_income_cents=int(calc["total_income"] * 100),
        tax_owed_cents=int(calc["tax_owed"] * 100),
        refund_amount_cents=int(calc["refund"] * 100),
        form_data=json.dumps(data.model_dump()),
    )
    db.add(tax_return)
    db.commit()
    db.refresh(tax_return)

    result = irs_efile.submit_1040(tax_return, data)
    tax_return.submission_id = result.get("submission_id")
    tax_return.status = ReturnStatus.submitted
    db.commit()
    db.refresh(tax_return)
    return tax_return


@router.get("/returns/{return_id}/status")
def get_return_status(
    return_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tax_return = db.query(TaxReturn).filter(
        TaxReturn.id == return_id,
        TaxReturn.user_id == current_user.id
    ).first()
    if not tax_return:
        raise HTTPException(status_code=404, detail="Return not found")
    if not tax_return.submission_id:
        raise HTTPException(status_code=400, detail="No submission ID on file")
    from app.services.taxbandits import get_4868_status
    result = get_4868_status(tax_return.submission_id)
    return result


@router.get("/returns", response_model=list[TaxReturnOut])
def list_returns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(TaxReturn).filter(TaxReturn.user_id == current_user.id).all()
