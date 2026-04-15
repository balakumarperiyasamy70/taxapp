from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Form4868(BaseModel):
    tax_year: int
    first_name: str
    last_name: str
    ssn: str
    spouse_ssn: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    estimated_tax: float        # total tax liability
    tax_payments: float         # already paid
    balance_due: float


class Form1040(BaseModel):
    tax_year: int
    filing_status: str          # single, married_joint, married_separate, head_household
    first_name: str
    last_name: str
    ssn: str
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    # Income
    wages: float = 0.0
    interest: float = 0.0
    dividends: float = 0.0
    other_income: float = 0.0
    # Deductions
    standard_deduction: bool = True
    itemized_deductions: float = 0.0
    # Credits
    child_tax_credit: float = 0.0
    earned_income_credit: float = 0.0


class TaxReturnOut(BaseModel):
    id: int
    tax_year: int
    return_type: str
    status: str
    refund_amount_cents: int
    tax_owed_cents: int
    submission_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
