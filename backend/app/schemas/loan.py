from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LoanApplication(BaseModel):
    tax_return_id: int
    requested_amount: float     # max $4000
    bank_routing: str
    bank_account: str
    # Applicant info (required for lender submission)
    first_name: str
    last_name: str
    ssn: str
    dob: str                    # MM/DD/YYYY
    address: str
    city: str
    state: str
    zip_code: str


class LoanOut(BaseModel):
    id: int
    requested_amount_cents: int
    approved_amount_cents: Optional[int]
    fee_cents: int
    status: str
    disbursed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
