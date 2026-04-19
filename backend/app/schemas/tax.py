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


class Dependent(BaseModel):
    first_name: str
    last_name: str
    ssn: str
    relationship: str
    qualifying_child: bool = True   # True = child tax credit; False = credit for other dependents


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
    dependents: list[Dependent] = []
    # Line 1 — Wages
    wages: float = 0.0                       # 1a  W-2 Box 1
    household_wages: float = 0.0             # 1b  household employee wages
    tip_income: float = 0.0                  # 1c  tip income not on W-2
    medicaid_waiver: float = 0.0             # 1d  Medicaid waiver payments
    dependent_care_benefits: float = 0.0    # 1e  Form 2441
    adoption_benefits: float = 0.0           # 1f  Form 8839
    wages_8919: float = 0.0                  # 1g  Form 8919
    other_earned_income: float = 0.0         # 1h  other earned income
    federal_withholding: float = 0.0         # W-2 Box 2
    state_withholding: float = 0.0           # W-2 Box 17
    # Line 2 — Interest
    tax_exempt_interest: float = 0.0         # 2a  tax-exempt interest (not taxable)
    taxable_interest: float = 0.0            # 2b  taxable interest (1099-INT)
    # Line 3 — Dividends
    qualified_dividends: float = 0.0         # 3a  qualified dividends
    ordinary_dividends: float = 0.0          # 3b  ordinary dividends (1099-DIV)
    # Line 4 — IRA Distributions
    ira_distributions_total: float = 0.0     # 4a  total IRA distributions (1099-R)
    ira_distributions_taxable: float = 0.0   # 4b  taxable portion
    # Line 5 — Pensions & Annuities
    pensions_total: float = 0.0              # 5a  total pensions/annuities
    pensions_taxable: float = 0.0            # 5b  taxable portion
    # Line 6 — Social Security
    social_security_benefits: float = 0.0   # 6a  total SS benefits (SSA-1099)
    # Line 7 — Capital Gain/Loss
    capital_gain_loss: float = 0.0           # 7   net capital gain or loss
    # Other income (flows to Schedule 1 → Line 8)
    unemployment_compensation: float = 0.0  # 1099-G
    other_income: float = 0.0
    # Payments
    estimated_tax_payments: float = 0.0     # Line 26  quarterly 1040-ES
    # Above-the-line adjustments
    student_loan_interest: float = 0.0      # max $2,500
    ira_deduction: float = 0.0              # max $7,000
    # Deductions
    standard_deduction: bool = True
    itemized_deductions: float = 0.0
    # Credits
    child_tax_credit: float = 0.0
    earned_income_credit: float = 0.0
    other_credits: float = 0.0
    # Direct deposit (optional)
    refund_routing: str = ''
    refund_account: str = ''
    refund_account_type: str = 'checking'


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
