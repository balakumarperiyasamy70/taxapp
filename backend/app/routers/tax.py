from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.tax import Form4868, Form1040, ScheduleC, Form1120S, Form1065, TaxReturnOut
from app.models.tax_return import TaxReturn, ReturnType, ReturnStatus
from app.routers.users import get_current_user
from app.models.user import User
from app.services import tax_service, irs_efile
from app.services.pdf_service import generate_pdf, protect_pdf, make_password
from app.services.email_service import send_pdf_email
from pydantic import BaseModel
import json
import io

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
        tax_owed_cents=int(calc["balance_due"] * 100),
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


@router.post("/business/schedule-c", response_model=TaxReturnOut)
def file_schedule_c(
    data: ScheduleC,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")
    calc = tax_service.calculate_schedule_c(data)
    tax_return = TaxReturn(
        user_id=current_user.id,
        tax_year=data.tax_year,
        return_type=ReturnType.schedule_c,
        status=ReturnStatus.draft,
        total_income_cents=int(data.gross_receipts * 100),
        tax_owed_cents=int(calc["tax_owed"] * 100),
        refund_amount_cents=0,
        form_data=json.dumps(data.model_dump()),
    )
    db.add(tax_return)
    db.commit()
    db.refresh(tax_return)
    return tax_return


@router.post("/business/1120s", response_model=TaxReturnOut)
def file_1120s(
    data: Form1120S,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")
    calc = tax_service.calculate_1120s(data)
    tax_return = TaxReturn(
        user_id=current_user.id,
        tax_year=data.tax_year,
        return_type=ReturnType.form_1120s,
        status=ReturnStatus.draft,
        total_income_cents=int(data.gross_receipts * 100),
        tax_owed_cents=0,
        refund_amount_cents=0,
        form_data=json.dumps(data.model_dump()),
    )
    db.add(tax_return)
    db.commit()
    db.refresh(tax_return)
    return tax_return


@router.post("/business/1065", response_model=TaxReturnOut)
def file_1065(
    data: Form1065,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Identity verification required")
    calc = tax_service.calculate_1065(data)
    tax_return = TaxReturn(
        user_id=current_user.id,
        tax_year=data.tax_year,
        return_type=ReturnType.form_1065,
        status=ReturnStatus.draft,
        total_income_cents=int(data.gross_receipts * 100),
        tax_owed_cents=0,
        refund_amount_cents=0,
        form_data=json.dumps(data.model_dump()),
    )
    db.add(tax_return)
    db.commit()
    db.refresh(tax_return)
    return tax_return


@router.get("/returns", response_model=list[TaxReturnOut])
def list_returns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(TaxReturn).filter(TaxReturn.user_id == current_user.id).all()


@router.get("/returns/{return_id}/pdf")
def download_pdf(
    return_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tax_return = db.query(TaxReturn).filter(
        TaxReturn.id == return_id, TaxReturn.user_id == current_user.id
    ).first()
    if not tax_return:
        raise HTTPException(status_code=404, detail="Return not found")

    form_data = json.loads(tax_return.form_data or '{}')

    if tax_return.return_type == ReturnType.individual_1040:
        try:
            from app.services.pdf_filler import fill_1040, add_watermark
            form_data["_refund"]      = tax_return.refund_amount_cents / 100
            form_data["_balance_due"] = tax_return.tax_owed_cents / 100
            pdf_bytes = fill_1040(form_data)
            pdf_bytes = add_watermark(pdf_bytes, "DRAFT - CLIENT COPY")
            filename = f"Form1040_{tax_return.tax_year}_{tax_return.id}.pdf"
        except FileNotFoundError:
            pdf_bytes = generate_pdf(tax_return)
            filename = f"TaxReturn_1040_{tax_return.tax_year}.pdf"
    else:
        pdf_bytes = generate_pdf(tax_return)
        filename = f"TaxReturn_{tax_return.return_type}_{tax_return.tax_year}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/returns/{return_id}/email-pdf")
def email_pdf(
    return_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tax_return = db.query(TaxReturn).filter(
        TaxReturn.id == return_id, TaxReturn.user_id == current_user.id
    ).first()
    if not tax_return:
        raise HTTPException(status_code=404, detail="Return not found")

    form_data = json.loads(tax_return.form_data or '{}')
    ssn_or_ein = form_data.get('ssn') or form_data.get('ein') or ''
    if not ssn_or_ein:
        raise HTTPException(status_code=400, detail="No SSN or EIN found on this return")

    # Auto-extract DOB from form_data if available, otherwise use 0000
    dob = form_data.get('dob', '')
    password = make_password(dob, ssn_or_ein)

    if tax_return.return_type == ReturnType.individual_1040:
        try:
            from app.services.pdf_filler import fill_1040
            form_data["_refund"]      = tax_return.refund_amount_cents / 100
            form_data["_balance_due"] = tax_return.tax_owed_cents / 100
            pdf_bytes = fill_1040(form_data)
        except FileNotFoundError:
            pdf_bytes = generate_pdf(tax_return)
    else:
        pdf_bytes = generate_pdf(tax_return)
    protected = protect_pdf(pdf_bytes, password)

    label = {
        "4868": "Form 4868", "1040": "Form 1040",
        "schedule_c": "Schedule C", "1120s": "Form 1120-S", "1065": "Form 1065",
    }.get(tax_return.return_type, tax_return.return_type)

    try:
        send_pdf_email(
            to_email=current_user.email,
            return_type=label,
            tax_year=tax_return.tax_year,
            pdf_bytes=protected,
            password=password,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")

    return {"message": f"PDF sent to {current_user.email}", "password_hint": "birth year + last 4 of SSN/EIN"}
