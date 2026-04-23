"""
Run on VPS to test Form 1040 PDF generation and diagnose field mapping.

Usage:
    cd /opt/taxapp/backend
    venv/bin/python3 scripts/test_1040_pdf.py

Output: /tmp/test_1040.pdf + field mapping diagnostic printed to console.
"""
import sys
import os
import io
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pypdf import PdfReader
from app.services.pdf_filler import FORMS_DIR

# ── Step 1: Inspect raw field names and positions from the IRS PDF ────────────
print("\n=== RAW FIELD NAMES FROM IRS f1040.pdf ===")
pdf_path = FORMS_DIR / "f1040.pdf"
reader = PdfReader(str(pdf_path))

page1_fields = []
page2_fields = []

for pg_i, page in enumerate(reader.pages):
    for ref in page.get("/Annots", []):
        annot = ref.get_object()
        if annot.get("/Subtype") != "/Widget":
            continue
        t = annot.get("/T")
        if not t:
            continue
        ft = str(annot.get("/FT", "?"))
        rect = annot.get("/Rect")
        y = float(rect[1]) if rect else 0
        entry = (str(t), ft, round(y, 1))
        if pg_i == 0:
            page1_fields.append(entry)
        else:
            page2_fields.append(entry)

# Sort by Y position descending (top of page first)
page1_fields.sort(key=lambda x: -x[2])
page2_fields.sort(key=lambda x: -x[2])

print(f"\nTotal fields — Page 1: {len(page1_fields)}  Page 2: {len(page2_fields)}")

print("\n--- PAGE 1 FIELDS (top to bottom) ---")
print(f"{'#':<4} {'Field Name':<25} {'Type':<14} {'Y-pos'}")
print("-" * 60)
for i, (name, ft, y) in enumerate(page1_fields):
    ftype = {"'/Tx'": "Text", "'/Btn'": "Checkbox", "'/Ch'": "Choice"}.get(repr(ft), ft)
    print(f"{i+1:<4} {name:<25} {ftype:<14} {y}")

print("\n--- PAGE 2 FIELDS (top to bottom) ---")
print(f"{'#':<4} {'Field Name':<25} {'Type':<14} {'Y-pos'}")
print("-" * 60)
for i, (name, ft, y) in enumerate(page2_fields):
    ftype = {"'/Tx'": "Text", "'/Btn'": "Checkbox", "'/Ch'": "Choice"}.get(repr(ft), ft)
    print(f"{i+1:<4} {name:<25} {ftype:<14} {y}")

# ── Step 2: Generate the test PDF ─────────────────────────────────────────────
print("\n\n=== GENERATING TEST PDF ===")
from app.services.pdf_filler import fill_1040, flatten_pdf, add_watermark

test_data = {
    "filing_status": "married_joint",
    "first_name": "John", "last_name": "Smith",
    "ssn": "123-45-6789", "dob": "1985-06-15",
    "spouse_first_name": "Jane", "spouse_last_name": "Smith",
    "spouse_ssn": "987-65-4321",
    "address": "100 Main St", "city": "Blytheville",
    "state": "AR", "zip_code": "72315",
    "wages": 75000,
    "household_wages": 0, "tip_income": 0, "medicaid_waiver": 0,
    "dependent_care_benefits": 0, "adoption_benefits": 0,
    "wages_8919": 0, "other_earned_income": 0,
    "federal_withholding": 9500, "state_withholding": 3200,
    "tax_exempt_interest": 100, "taxable_interest": 850,
    "ordinary_dividends": 600, "qualified_dividends": 450,
    "ira_distributions_total": 5000, "ira_distributions_taxable": 5000,
    "pensions_total": 12000, "pensions_taxable": 12000,
    "social_security_benefits": 8000,
    "capital_gain_loss": 2500,
    "unemployment_compensation": 0, "other_income": 0,
    "estimated_tax_payments": 500,
    "student_loan_interest": 2500, "ira_deduction": 0,
    "standard_deduction": True, "itemized_deductions": 0,
    "child_tax_credit": 4000, "earned_income_credit": 0, "other_credits": 0,
    "refund_routing": "021000021", "refund_account": "123456789",
    "refund_account_type": "checking",
    "dependents": [
        {"first_name": "Emma", "last_name": "Smith", "ssn": "111-22-3333",
         "relationship": "Daughter", "qualifying_child": True},
        {"first_name": "Liam", "last_name": "Smith", "ssn": "444-55-6666",
         "relationship": "Son", "qualifying_child": True},
    ],
}

print("Filling Form 1040...")
pdf = fill_1040(test_data)

# ── Step 3: Show what values landed in which fields ───────────────────────────
print("\n=== FILLED FIELD VALUES (non-empty) ===")
reader2 = PdfReader(io.BytesIO(pdf))
for pg_i, page in enumerate(reader2.pages):
    for ref in page.get("/Annots", []):
        annot = ref.get_object()
        if annot.get("/Subtype") != "/Widget":
            continue
        t = annot.get("/T")
        v = annot.get("/V")
        if t and v:
            val = str(v).strip("() ")
            if val and val not in ("/Off",):
                print(f"  Page {pg_i+1}  {str(t):<25}  = {val}")

print("\nFlattening (non-editable)...")
pdf = flatten_pdf(pdf)

print("Adding watermark...")
pdf = add_watermark(pdf, "DRAFT - CLIENT COPY")

out = "/tmp/test_1040.pdf"
with open(out, "wb") as f:
    f.write(pdf)

print(f"\nSUCCESS — {len(pdf):,} bytes written to {out}")
