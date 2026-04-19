"""
Fills official IRS PDF forms with user-submitted tax data.

Field names were verified against the 2024 IRS Form 1040 PDF using:
    python3 scripts/inspect_fields.py app/forms/f1040.pdf

Page 1 layout:  f1_01–f1_06 (names/SSN), f1_20–f1_24 (address),
                f1_47–f1_75 (income through taxable income)
Page 2 layout:  f2_01–f2_26 (tax, credits, payments, refund/owed)
"""
import io
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from app.services.tax_service import calculate_tax, STANDARD_DEDUCTION

FORMS_DIR = Path(__file__).parent.parent / "forms"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _f(v) -> str:
    """Format a dollar amount for an IRS field. Blank when zero."""
    try:
        n = float(v or 0)
        return f"{n:.2f}" if n else ""
    except (TypeError, ValueError):
        return ""


def _calc(d: dict) -> dict:
    """Derive all intermediate tax values from raw form data."""
    wages   = float(d.get("wages") or 0)
    intst   = float(d.get("interest") or 0)
    divs    = float(d.get("dividends") or 0)
    unemp   = float(d.get("unemployment_compensation") or 0)
    ira_d   = float(d.get("ira_distributions") or 0)
    ss      = float(d.get("social_security_benefits") or 0)
    other   = float(d.get("other_income") or 0)
    est_pmts = float(d.get("estimated_tax_payments") or 0)
    fed_wh  = float(d.get("federal_withholding") or 0)

    ss_taxable = ss * 0.85          # simplified: 85% of SS is taxable

    # Schedule 1 income (unemployment + other → flows to Form 1040 Line 8)
    sched1_income = unemp + other

    total_income = wages + intst + divs + ira_d + ss_taxable + sched1_income

    # Above-the-line adjustments → Schedule 1 → 1040 Line 10
    sl_adj  = min(float(d.get("student_loan_interest") or 0), 2500.0)
    ira_adj = min(float(d.get("ira_deduction") or 0), 7000.0)
    adj     = sl_adj + ira_adj

    agi = max(0.0, total_income - adj)

    fs = d.get("filing_status", "single")
    if d.get("standard_deduction", True):
        ded = float(STANDARD_DEDUCTION.get(fs, 14600))
    else:
        ded = float(d.get("itemized_deductions") or 0)

    taxable = max(0.0, agi - ded)
    gross_tax = calculate_tax(taxable, fs)

    child_cr = float(d.get("child_tax_credit") or 0)
    eic      = float(d.get("earned_income_credit") or 0)
    other_cr = float(d.get("other_credits") or 0)
    total_cr = child_cr + eic + other_cr

    tax_after_cr = max(0.0, gross_tax - total_cr)
    tax_liability = tax_after_cr          # no other taxes for simple filers

    total_pmts = fed_wh + est_pmts + eic  # EIC is a refundable credit (payment)
    refund     = max(0.0, total_pmts - tax_liability)
    balance_due = max(0.0, tax_liability - total_pmts)

    return {
        "wages": wages,
        "interest": intst,
        "dividends": divs,
        "ira_d": ira_d,
        "ss_full": ss,
        "ss_taxable": ss_taxable,
        "sched1_income": sched1_income,
        "total_income": total_income,
        "adj": adj,
        "agi": agi,
        "ded": ded,
        "taxable": taxable,
        "gross_tax": gross_tax,
        "child_cr": child_cr,
        "eic": eic,
        "total_cr": total_cr,
        "tax_after_cr": tax_after_cr,
        "tax_liability": tax_liability,
        "fed_wh": fed_wh,
        "est_pmts": est_pmts,
        "total_pmts": total_pmts,
        "refund": refund,
        "balance_due": balance_due,
    }


def _fill_pdf(pdf_path: Path, fields: dict) -> bytes:
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)
    for page in writer.pages:
        writer.update_page_form_field_values(page, fields)
    # NeedAppearances = True → PDF viewers regenerate field appearances so
    # pre-filled values are visible while the form remains fillable/printable.
    from pypdf.generic import NameObject, BooleanObject
    if "/AcroForm" in writer._root_object:
        writer._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def flatten_pdf(pdf_bytes: bytes) -> bytes:
    """Flatten AcroForm fields into static page content (non-editable).
    Uses pdftoppm (poppler-utils) + img2pdf for reliable IRS PDF rendering.
    Requires: apt-get install -y poppler-utils && pip install img2pdf
    """
    import subprocess, tempfile, os, glob, img2pdf

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as src_f:
        src_f.write(pdf_bytes)
        src_path = src_f.name
    out_dir = tempfile.mkdtemp()
    dst_path = src_path + "_flat.pdf"
    try:
        # Render each page to PNG at 150 DPI using poppler
        subprocess.run(
            ["pdftoppm", "-r", "150", "-png", src_path,
             os.path.join(out_dir, "page")],
            check=True, capture_output=True
        )
        pages = sorted(glob.glob(os.path.join(out_dir, "*.png")))
        with open(dst_path, "wb") as f:
            f.write(img2pdf.convert(pages))
        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(src_path)
        for p in glob.glob(os.path.join(out_dir, "*")):
            os.unlink(p)
        os.rmdir(out_dir)
        if os.path.exists(dst_path):
            os.unlink(dst_path)


def add_watermark(pdf_bytes: bytes, text: str = "DRAFT - CLIENT COPY") -> bytes:
    """Overlay a diagonal watermark on every page. Used for client/download copies."""
    from fpdf import FPDF

    wm = FPDF(unit="pt", format=(612, 792))
    wm.add_page()
    wm.set_font("Helvetica", style="B", size=52)
    wm.set_text_color(200, 200, 200)
    with wm.rotation(angle=45, x=306, y=396):
        w = wm.get_string_width(text)
        wm.text(x=306 - w / 2, y=414, txt=text)

    wm_page = PdfReader(io.BytesIO(bytes(wm.output()))).pages[0]

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.append(reader)          # preserves AcroForm + all interactive fields
    for page in writer.pages:
        page.merge_page(wm_page)   # stamp watermark on top of each page

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ── Form 1040 ─────────────────────────────────────────────────────────────────
#
# Field name reference (2024 IRS Form 1040, verified via inspect_fields.py):
#
# Page 1
# -------
# f1_01  Your first name & MI       f1_02  Your last name
# f1_03  Your SSN                   f1_04  Spouse first name & MI
# f1_05  Spouse last name           f1_06  Spouse SSN
# f1_07–f1_19  MFS/HOH name fields, digital assets, phone, email, etc.
#
# Address_ReadOrder group:
# f1_20  Street address             f1_21  Apt no
# f1_22  City                       f1_23  State        f1_24  ZIP
# f1_25  Foreign country            f1_26  Foreign province   f1_27  Foreign ZIP
#
# Dependents table:
# f1_31–f1_34  Dependent 1         f1_35–f1_38  Dependent 2
# f1_39–f1_42  Dependent 3         f1_43–f1_46  Dependent 4
#
# Income lines (Page 1):
# f1_47  Line 1a  Wages (W-2)       f1_48  Line 1b  Household employee wages
# f1_49  Line 1c  Tip income        f1_50  Line 1d  Medicaid waiver
# f1_51  Line 1e  Dependent care    f1_52  Line 1f  Adoption benefits
# f1_53  Line 1g  Form 8919 wages   f1_54  Line 1h  Other earned income
# f1_55  Line 1z  Total wages
# f1_56  Line 2a  Tax-exempt int    f1_57  Line 2b  Taxable interest
# f1_58  Line 3a  Qualified divs    f1_59  Line 3b  Ordinary dividends
# f1_60  Line 4a  IRA distribs      f1_61  Line 4b  Taxable IRA amount
# f1_62  Line 5a  Pensions          f1_63  Line 5b  Taxable pensions
# f1_64  Line 6a  SS benefits       f1_65  Line 6b  Taxable SS
# f1_66  Line 7   Capital gain/loss
# f1_67  Line 8   Additional income (Sch 1 line 10 — incl. unemployment)
# f1_68  Line 9   Total income
# f1_69  Line 10  Adjustments (Sch 1)
# f1_70  Line 11  AGI
# f1_71  Line 12  Std/itemized deduction
# f1_72  Line 13  QBI deduction
# f1_73  Line 14  Add lines 12+13
# f1_74  Line 15  Taxable income
# f1_75  (reserved / total check)
#
# Page 2
# -------
# f2_01  Line 16  Tax               f2_02  Line 17  AMT
# f2_03  Line 18  Add 16+17         f2_04  Line 19  Child tax credit
# f2_05  Line 20  Sch 3 credits     f2_06  Line 21  Total credits
# f2_07  Line 22  Tax minus credits f2_08  Line 23  Other taxes (Sch 2)
# f2_09  Line 24  Total tax
# f2_10  Line 25a W-2 withheld      f2_11  Line 25b 1099 withheld
# f2_12  Line 25c Other withheld    f2_13  Line 25d Total withheld
# f2_14  Line 26  Estimated pmts    f2_15  Line 27  EIC
# f2_16  Line 28  ACTC              f2_17  Line 29  AOC
# f2_18  Line 30  (reserved)        f2_19  Line 31  Sch 3 line 15
# f2_20  Line 32  Other pmts        f2_21  Line 33  Total other pmts
# f2_22  SSN (signature area)
# f2_23  Line 34  Total payments    f2_24  Line 35a Refund
# f2_25  Line 36  Apply to next yr  f2_26  Line 37  Amount owed
# f2_27  Line 38  Penalty
# f2_32  Routing number             f2_33  Account number
#
# Filing status checkboxes (Page 1):
# c1_1   Single       c1_2  Married filing jointly
# c1_3   MFS          c1_4  Head of household    c1_5  QSS
#
def fill_1040(form_data: dict) -> bytes:
    pdf_path = FORMS_DIR / "f1040.pdf"
    if not pdf_path.exists():
        raise FileNotFoundError(
            "IRS Form 1040 PDF not found. "
            "Run: bash backend/scripts/download_irs_forms.sh on VPS"
        )

    d  = form_data
    fs = d.get("filing_status", "single")
    c  = _calc(d)

    fields = {
        # ── Personal Info ──────────────────────────────────────────────────
        "f1_01[0]": d.get("first_name", ""),
        "f1_02[0]": d.get("last_name", ""),
        "f1_03[0]": d.get("ssn", ""),
        "f1_04[0]": d.get("spouse_first_name") or "",
        "f1_05[0]": d.get("spouse_last_name") or "",
        "f1_06[0]": d.get("spouse_ssn") or "",

        # ── Filing Status ──────────────────────────────────────────────────
        "c1_1[0]": "/Yes" if fs == "single" else "/Off",
        "c1_2[0]": "/Yes" if fs == "married_joint" else "/Off",
        "c1_3[0]": "/Yes" if fs == "married_separate" else "/Off",
        "c1_4[0]": "/Yes" if fs == "head_household" else "/Off",
        "c1_5[0]": "/Off",

        # ── Address ────────────────────────────────────────────────────────
        "f1_20[0]": d.get("address", ""),
        "f1_21[0]": "",                       # apt/suite (not collected separately)
        "f1_22[0]": d.get("city", ""),
        "f1_23[0]": d.get("state", ""),
        "f1_24[0]": d.get("zip_code", ""),

        # ── Income — Page 1 ────────────────────────────────────────────────
        "f1_47[0]": _f(c["wages"]),           # 1a  wages from W-2
        "f1_55[0]": _f(c["wages"]),           # 1z  total wages (no other wage types)
        "f1_57[0]": _f(c["interest"]),        # 2b  taxable interest
        "f1_59[0]": _f(c["dividends"]),       # 3b  ordinary dividends
        "f1_60[0]": _f(c["ira_d"]),           # 4a  IRA distributions (total)
        "f1_61[0]": _f(c["ira_d"]),           # 4b  taxable IRA amount
        "f1_64[0]": _f(c["ss_full"]),         # 6a  social security benefits (full)
        "f1_65[0]": _f(c["ss_taxable"]),      # 6b  taxable SS (85%)
        "f1_67[0]": _f(c["sched1_income"]),   # 8   additional income (unemp + other)
        "f1_68[0]": _f(c["total_income"]),    # 9   total income
        "f1_69[0]": _f(c["adj"]),             # 10  adjustments (student loan + IRA ded)
        "f1_70[0]": _f(c["agi"]),             # 11  AGI
        "f1_71[0]": _f(c["ded"]),             # 12  standard or itemized deduction
        "f1_73[0]": _f(c["ded"]),             # 14  add lines 12+13 (QBI=0 so same)
        "f1_74[0]": _f(c["taxable"]),         # 15  taxable income

        # ── Tax & Credits — Page 2 ─────────────────────────────────────────
        "f2_01[0]": _f(c["gross_tax"]),       # 16  tax
        "f2_03[0]": _f(c["gross_tax"]),       # 18  add lines 16+17 (AMT=0 so same)
        "f2_04[0]": _f(c["child_cr"]),        # 19  child tax credit
        "f2_06[0]": _f(c["total_cr"]),        # 21  total credits
        "f2_07[0]": _f(c["tax_after_cr"]),    # 22  tax minus credits
        "f2_09[0]": _f(c["tax_liability"]),   # 24  total tax

        # ── Payments ────────────────────────────────────────────────────────
        "f2_10[0]": _f(c["fed_wh"]),          # 25a W-2 federal withholding
        "f2_13[0]": _f(c["fed_wh"]),          # 25d total withholding
        "f2_14[0]": _f(c["est_pmts"]),        # 26  estimated tax payments
        "f2_15[0]": _f(c["eic"]),             # 27  earned income credit
        "f2_23[0]": _f(c["total_pmts"]),      # 34  total payments

        # ── Refund / Amount Owed ────────────────────────────────────────────
        "f2_24[0]": _f(c["refund"]),          # 35a refund
        "f2_26[0]": _f(c["balance_due"]),     # 37  amount owed

        # ── Page 2 SSN (signature area) ─────────────────────────────────────
        "f2_22[0]": d.get("ssn", ""),

        # ── Paid Preparer Use Only ────────────────────────────────────────────
        # Fields f2_34–f2_51 cover signature/preparer area at bottom of page 2.
        # Approximate mapping (preparer name, PTIN, firm, phone):
        "f2_41[0]": "TaxRefundLoan.us",
        "f2_42[0]": "PENDING",            # PTIN — update when IRS registration complete
        "f2_43[0]": "TaxRefundLoan.us",   # Firm name
        "f2_46[0]": "",                    # Firm EIN (blank until registered)
    }

    return _fill_pdf(pdf_path, fields)
