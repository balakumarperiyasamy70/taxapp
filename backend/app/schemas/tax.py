from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Form4868(BaseModel):
    tax_year: int
    first_name: str
    last_name: str
    ssn: str
    spouse_ssn: Optional[str] = None
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_phone: Optional[str] = None
    spouse_pin: Optional[str] = None
    spouse_dob: Optional[str] = None
    spouse_prev_year_agi: Optional[float] = None
    address: str
    city: str
    state: str
    zip_code: str
    estimated_tax: float        # total tax liability
    tax_payments: float         # already paid
    balance_due: float
    # TaxBandits signature fields
    pin: str                    # 5-digit IRS self-select PIN
    dob: str                    # MM/DD/YYYY
    prev_year_agi: float        # prior year adjusted gross income


class Form1040(BaseModel):
    tax_year: int
    filing_status: str          # single, married_joint, married_separate, head_household
    first_name: str
    last_name: str
    ssn: str
    dob: str = ''               # YYYY-MM-DD or MM/DD/YYYY — used for PDF password
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    dependent_count: int = 0    # qualifying children under 17
    # W-2 Income
    wages: float = 0.0
    federal_withholding: float = 0.0        # W-2 Box 2
    state_withholding: float = 0.0          # W-2 Box 17
    # Other Income
    interest: float = 0.0                   # 1099-INT
    dividends: float = 0.0                  # 1099-DIV
    unemployment_compensation: float = 0.0  # 1099-G
    social_security_benefits: float = 0.0   # SSA-1099 (85% included in income)
    ira_distributions: float = 0.0          # 1099-R
    other_income: float = 0.0
    estimated_tax_payments: float = 0.0     # quarterly 1040-ES payments
    # Above-the-line adjustments
    student_loan_interest: float = 0.0      # max $2,500
    ira_deduction: float = 0.0              # max $7,000 for 2024
    # Deductions
    standard_deduction: bool = True
    itemized_deductions: float = 0.0
    # Credits
    child_tax_credit: float = 0.0
    earned_income_credit: float = 0.0
    other_credits: float = 0.0


class ScheduleC(BaseModel):
    tax_year: int
    first_name: str
    last_name: str
    ssn: str
    business_name: str
    ein: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    principal_business: str
    gross_receipts: float = 0.0
    returns_allowances: float = 0.0
    cost_of_goods: float = 0.0
    advertising: float = 0.0
    car_expenses: float = 0.0
    depreciation: float = 0.0
    insurance: float = 0.0
    legal_professional: float = 0.0
    office_expense: float = 0.0
    rent_lease: float = 0.0
    supplies: float = 0.0
    taxes_licenses: float = 0.0
    travel: float = 0.0
    utilities: float = 0.0
    wages: float = 0.0
    other_expenses: float = 0.0
    home_office_deduction: float = 0.0


class Form1120S(BaseModel):
    tax_year: int
    corporation_name: str
    ein: str
    address: str
    city: str
    state: str
    zip_code: str
    date_incorporated: str
    state_incorporated: str
    total_assets: float = 0.0
    ordinary_income: float = 0.0
    gross_receipts: float = 0.0
    cost_of_goods: float = 0.0
    compensation_officers: float = 0.0
    salaries_wages: float = 0.0
    repairs: float = 0.0
    bad_debts: float = 0.0
    rents: float = 0.0
    taxes_licenses: float = 0.0
    interest: float = 0.0
    depreciation: float = 0.0
    advertising: float = 0.0
    other_deductions: float = 0.0
    shareholder_count: int = 1


class Form1065(BaseModel):
    tax_year: int
    partnership_name: str
    ein: str
    address: str
    city: str
    state: str
    zip_code: str
    date_formed: str
    state_formed: str
    total_assets: float = 0.0
    gross_receipts: float = 0.0
    cost_of_goods: float = 0.0
    ordinary_income: float = 0.0
    salaries_wages: float = 0.0
    guaranteed_payments: float = 0.0
    repairs: float = 0.0
    bad_debts: float = 0.0
    rents: float = 0.0
    taxes_licenses: float = 0.0
    interest: float = 0.0
    depreciation: float = 0.0
    other_deductions: float = 0.0
    partner_count: int = 2


class TaxReturnOut(BaseModel):
    id: int
    tax_year: int
    return_type: str
    status: str
    refund_amount_cents: int
    tax_owed_cents: int
    submission_id: Optional[str]
    irs_timestamp: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
