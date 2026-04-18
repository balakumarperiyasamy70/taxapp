"""
Fills official IRS PDF forms with user-submitted tax data using AcroForm fields.

Field names are based on IRS Form 1040 (2024).
Run backend/scripts/inspect_fields.py on any PDF to see its exact field names.
If a field name is wrong, pypdf silently skips it — run inspect to verify.
"""
import io
from pathlib import Path
from pypdf import PdfReader, PdfWriter

FORMS_DIR = Path(__file__).parent.parent / "forms"

STD_DEDUCTION = {
    "single": 14600.0,
    "married_joint": 29200.0,
    "married_separate": 14600.0,
    "head_household": 21900.0,
}

# Filing status → value written into the PDF checkbox/radio field
FILING_STATUS_VALUE = {
    "single":           "1",
    "married_joint":    "2",
    "married_separate": "3",
    "head_household":   "4",
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _f(v) -> str:
    """Format a number for an IRS PDF field. Returns empty string for zero."""
    try:
        n = float(v or 0)
        return f"{n:.2f}" if n else ""
    except (TypeError, ValueError):
        return ""


def _ss_taxable(d: dict) -> float:
    return float(d.get("social_security_benefits") or 0) * 0.85


def _above_line_adj(d: dict) -> float:
    sl  = min(float(d.get("student_loan_interest") or 0), 2500.0)
    ira = min(float(d.get("ira_deduction") or 0), 7000.0)
    return sl + ira


def _total_income(d: dict) -> float:
    return (
        float(d.get("wages") or 0) +
        float(d.get("interest") or 0) +
        float(d.get("dividends") or 0) +
        float(d.get("unemployment_compensation") or 0) +
        float(d.get("ira_distributions") or 0) +
        _ss_taxable(d) +
        float(d.get("other_income") or 0)
    )


def _agi(d: dict) -> float:
    return max(0.0, _total_income(d) - _above_line_adj(d))


def _deduction(d: dict) -> float:
    if d.get("standard_deduction", True):
        return STD_DEDUCTION.get(d.get("filing_status", "single"), 14600.0)
    return float(d.get("itemized_deductions") or 0)


def _taxable_income(d: dict) -> float:
    return max(0.0, _agi(d) - _deduction(d))


def _total_payments(d: dict) -> float:
    return (
        float(d.get("federal_withholding") or 0) +
        float(d.get("estimated_tax_payments") or 0)
    )


def _fill_pdf(pdf_path: Path, fields: dict) -> bytes:
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)
    for page in writer.pages:
        writer.update_page_form_field_values(page, fields)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ── Form 1040 filler ──────────────────────────────────────────────────────────
#
# Field names below are from IRS Form 1040 (2024).
# Run: python3 scripts/inspect_fields.py app/forms/f1040.pdf
# to see every field name in the downloaded PDF and verify/update the map.
#
def fill_1040(form_data: dict) -> bytes:
    pdf_path = FORMS_DIR / "f1040.pdf"
    if not pdf_path.exists():
        raise FileNotFoundError(
            "IRS Form 1040 not found. Run: bash backend/scripts/download_irs_forms.sh on VPS"
        )

    d  = form_data
    fs = d.get("filing_status", "single")

    ti   = _total_income(d)
    agi  = _agi(d)
    ded  = _deduction(d)
    txbl = _taxable_income(d)
    adj  = _above_line_adj(d)
    pmts = _total_payments(d)

    credits = (
        float(d.get("child_tax_credit") or 0) +
        float(d.get("earned_income_credit") or 0) +
        float(d.get("other_credits") or 0)
    )

    fields = {
        # ── Page 1 — Personal Information ─────────────────────────────────────
        "f1_04[0]":  d.get("first_name", ""),
        "f1_05[0]":  d.get("last_name", ""),
        "f1_06[0]":  d.get("ssn", ""),
        "f1_07[0]":  d.get("spouse_first_name") or "",
        "f1_08[0]":  d.get("spouse_last_name") or "",
        "f1_09[0]":  d.get("spouse_ssn") or "",
        "f1_10[0]":  d.get("address", ""),
        "f1_11[0]":  "",                            # apt/suite
        "f1_12[0]":  d.get("city", ""),
        "f1_13[0]":  d.get("state", ""),
        "f1_14[0]":  d.get("zip_code", ""),

        # ── Filing Status (radio / checkbox) ──────────────────────────────────
        "c1_1[0]":   FILING_STATUS_VALUE.get(fs, "1"),

        # ── Income — Lines 1a–9 ───────────────────────────────────────────────
        "f1_25[0]":  _f(d.get("wages")),              # 1a  wages (from W-2)
        "f1_33[0]":  _f(d.get("wages")),              # 1z  total wages line
        "f1_35[0]":  _f(d.get("interest")),           # 2b  taxable interest
        "f1_37[0]":  _f(d.get("dividends")),          # 3b  ordinary dividends
        "f1_39[0]":  _f(d.get("ira_distributions")),  # 4b  taxable IRA distributions
        "f1_41[0]":  _f(0),                           # 5b  pensions/annuities (not collected separately)
        "f1_43[0]":  _f(_ss_taxable(d)),              # 6b  taxable social security
        "f1_44[0]":  "",                               # 7   capital gain/loss (not yet implemented)
        "f1_45[0]":  _f(
            float(d.get("unemployment_compensation") or 0) +
            float(d.get("other_income") or 0)
        ),                                             # 8   other income (Sch 1 line 10)
        "f1_46[0]":  _f(ti),                          # 9   total income

        # ── Adjustments — Lines 10–11 ─────────────────────────────────────────
        "f1_47[0]":  _f(adj),                         # 10  adjustments from Sch 1
        "f1_48[0]":  _f(agi),                         # 11  adjusted gross income

        # ── Deductions — Lines 12–15 ──────────────────────────────────────────
        "f1_49[0]":  _f(ded),                         # 12  standard or itemized deduction
        "f1_50[0]":  "",                               # 13  QBI deduction (not implemented)
        "f1_51[0]":  _f(ded),                         # 14  sum of lines 12+13
        "f1_52[0]":  _f(txbl),                        # 15  taxable income

        # ── Page 2 — Tax & Credits ─────────────────────────────────────────────
        "f2_04[0]":  _f(d.get("child_tax_credit")),   # 19  child tax credit
        "f2_06[0]":  _f(credits),                     # 21  total credits

        # ── Payments — Lines 25–33 ────────────────────────────────────────────
        "f2_10[0]":  _f(d.get("federal_withholding")),      # 25a W-2 fed withheld
        "f2_13[0]":  _f(d.get("estimated_tax_payments")),   # 26  estimated tax payments
        "f2_14[0]":  _f(d.get("earned_income_credit")),     # 27  earned income credit
        "f2_20[0]":  _f(pmts),                              # 33  total payments

        # ── Refund / Amount Owed — Lines 34–38 ───────────────────────────────
        # (calculated by backend tax_service; we pass totals)
        "f2_21[0]":  _f(max(0.0, pmts - max(0.0, 0))),     # 35a refund (filled by router)
        "f2_26[0]":  "",                                     # 37  amount owed (filled by router)

        # ── Tax Year ──────────────────────────────────────────────────────────
        "f1_01[0]":  str(d.get("tax_year", 2024)),
    }

    return _fill_pdf(pdf_path, fields)
