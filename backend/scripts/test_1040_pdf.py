"""
Run on VPS to test Form 1040 PDF generation end-to-end.

Usage:
    cd /opt/taxapp/backend
    venv/bin/python3 scripts/test_1040_pdf.py

Output: /tmp/test_1040.pdf  — open in browser or download to verify fields.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.pdf_filler import fill_1040, flatten_pdf, add_watermark

test_data = {
    "filing_status": "married_joint",
    "first_name": "John", "last_name": "Smith",
    "ssn": "123-45-6789", "dob": "1985-06-15",
    "spouse_first_name": "Jane", "spouse_last_name": "Smith",
    "spouse_ssn": "987-65-4321",
    "address": "100 Main St", "city": "Blytheville",
    "state": "AR", "zip_code": "72315",

    # Line 1 wages
    "wages": 75000,
    "household_wages": 0,
    "tip_income": 0,
    "medicaid_waiver": 0,
    "dependent_care_benefits": 0,
    "adoption_benefits": 0,
    "wages_8919": 0,
    "other_earned_income": 0,

    # Withholding
    "federal_withholding": 9500,
    "state_withholding": 3200,

    # Interest & dividends
    "tax_exempt_interest": 100,
    "taxable_interest": 850,
    "ordinary_dividends": 600,
    "qualified_dividends": 450,

    # IRA / pensions
    "ira_distributions_total": 5000,
    "ira_distributions_taxable": 5000,
    "pensions_total": 12000,
    "pensions_taxable": 12000,

    # Social security
    "social_security_benefits": 8000,

    # Other income
    "capital_gain_loss": 2500,
    "unemployment_compensation": 0,
    "other_income": 0,
    "estimated_tax_payments": 500,

    # Adjustments
    "student_loan_interest": 2500,
    "ira_deduction": 0,
    "standard_deduction": True,
    "itemized_deductions": 0,

    # Credits
    "child_tax_credit": 4000,
    "earned_income_credit": 0,
    "other_credits": 0,

    # Direct deposit
    "refund_routing": "021000021",
    "refund_account": "123456789",
    "refund_account_type": "checking",

    # Dependents
    "dependents": [
        {"first_name": "Emma",  "last_name": "Smith", "ssn": "111-22-3333", "relationship": "Daughter", "qualifying_child": True},
        {"first_name": "Liam",  "last_name": "Smith", "ssn": "444-55-6666", "relationship": "Son",      "qualifying_child": True},
    ],
}

print("Filling Form 1040...")
pdf = fill_1040(test_data)

print("Flattening (non-editable)...")
pdf = flatten_pdf(pdf)

print("Adding watermark...")
pdf = add_watermark(pdf, "DRAFT - CLIENT COPY")

out = "/tmp/test_1040.pdf"
with open(out, "wb") as f:
    f.write(pdf)

print(f"SUCCESS — {len(pdf):,} bytes written to {out}")
print()
print("To download locally, run on your machine:")
print('  scp root@129.121.85.32:/tmp/test_1040.pdf ~/Downloads/test_1040.pdf')
