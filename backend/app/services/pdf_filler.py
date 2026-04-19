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
    wages_1a = float(d.get("wages") or 0)
    wages_1b = float(d.get("household_wages") or 0)
    wages_1c = float(d.get("tip_income") or 0)
    wages_1d = float(d.get("medicaid_waiver") or 0)
    wages_1e = float(d.get("dependent_care_benefits") or 0)
    wages_1f = float(d.get("adoption_benefits") or 0)
    wages_1g = float(d.get("wages_8919") or 0)
    wages_1h = float(d.get("other_earned_income") or 0)
    total_wages = wages_1a + wages_1b + wages_1c + wages_1d + wages_1e + wages_1f + wages_1g + wages_1h

    tax_exempt_int = float(d.get("tax_exempt_interest") or 0)
    taxable_int    = float(d.get("taxable_interest") or d.get("interest") or 0)
    qualified_divs = float(d.get("qualified_dividends") or 0)
    ordinary_divs  = float(d.get("ordinary_dividends") or d.get("dividends") or 0)
    ira_total      = float(d.get("ira_distributions_total") or d.get("ira_distributions") or 0)
    ira_taxable    = float(d.get("ira_distributions_taxable") or ira_total)
    pensions_total = float(d.get("pensions_total") or 0)
    pensions_tax   = float(d.get("pensions_taxable") or 0)
    ss             = float(d.get("social_security_benefits") or 0)
    capital_gain   = float(d.get("capital_gain_loss") or 0)
    unemp          = float(d.get("unemployment_compensation") or 0)
    other          = float(d.get("other_income") or 0)
    est_pmts       = float(d.get("estimated_tax_payments") or 0)
    fed_wh         = float(d.get("federal_withholding") or 0)

    ss_taxable    = ss * 0.85
    sched1_income = unemp + other

    total_income = (
        total_wages + taxable_int + ordinary_divs +
        ira_taxable + pensions_tax + ss_taxable +
        capital_gain + sched1_income
    )

    sl_adj  = min(float(d.get("student_loan_interest") or 0), 2500.0)
    ira_adj = min(float(d.get("ira_deduction") or 0), 7000.0)
    adj     = sl_adj + ira_adj

    agi = max(0.0, total_income - adj)

    fs = d.get("filing_status", "single")
    if d.get("standard_deduction", True):
        ded = float(STANDARD_DEDUCTION.get(fs, 14600))
    else:
        ded = float(d.get("itemized_deductions") or 0)

    taxable   = max(0.0, agi - ded)
    gross_tax = calculate_tax(taxable, fs)

    child_cr = float(d.get("child_tax_credit") or 0)
    eic      = float(d.get("earned_income_credit") or 0)
    other_cr = float(d.get("other_credits") or 0)
    total_cr = child_cr + eic + other_cr

    tax_after_cr  = max(0.0, gross_tax - total_cr)
    tax_liability = tax_after_cr

    total_pmts  = fed_wh + est_pmts + eic
    refund      = max(0.0, total_pmts - tax_liability)
    balance_due = max(0.0, tax_liability - total_pmts)

    return {
        "wages_1a": wages_1a, "wages_1b": wages_1b, "wages_1c": wages_1c,
        "wages_1d": wages_1d, "wages_1e": wages_1e, "wages_1f": wages_1f,
        "wages_1g": wages_1g, "wages_1h": wages_1h, "total_wages": total_wages,
        "tax_exempt_int": tax_exempt_int,
        "taxable_int": taxable_int,
        "qualified_divs": qualified_divs,
        "ordinary_divs": ordinary_divs,
        "ira_total": ira_total, "ira_taxable": ira_taxable,
        "pensions_total": pensions_total, "pensions_tax": pensions_tax,
        "ss_full": ss, "ss_taxable": ss_taxable,
        "capital_gain": capital_gain,
        "sched1_income": sched1_income,
        "total_income": total_income,
        "adj": adj, "agi": agi, "ded": ded, "taxable": taxable,
        "gross_tax": gross_tax,
        "child_cr": child_cr, "eic": eic, "total_cr": total_cr,
        "tax_after_cr": tax_after_cr, "tax_liability": tax_liability,
        "fed_wh": fed_wh, "est_pmts": est_pmts, "total_pmts": total_pmts,
        "refund": refund, "balance_due": balance_due,
    }


def _fill_pdf(pdf_path: Path, fields: dict) -> bytes:
    """Fill AcroForm fields by leaf /T name.

    Directly sets /V on every matching Widget annotation.  For text fields
    the /AP appearance stream is deleted so flatten_pdf's Pillow overlay
    renders the value — this prevents blank fields caused by stale /AP
    streams that pypdf cannot regenerate for IRS calculated fields.
    Checkboxes keep their /AP graphics; only /V and /AS are written.
    """
    from pypdf.generic import NameObject, BooleanObject, create_string_object

    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)

    # Callers use leaf names (e.g. "f1_03[0]"); strip any dotted prefix.
    leaf_map = {k.split(".")[-1]: v for k, v in fields.items()}

    for page in writer.pages:
        for annot_ref in page.get("/Annots", []):
            annot = annot_ref.get_object()
            if annot.get("/Subtype") != "/Widget":
                continue
            t = annot.get("/T")
            if t is None:
                continue
            key = str(t)
            if key not in leaf_map:
                continue
            val = leaf_map[key]
            ft = str(annot.get("/FT", ""))
            if ft == "/Btn":
                annot[NameObject("/V")]  = NameObject(val)
                annot[NameObject("/AS")] = NameObject(val)
            else:
                annot[NameObject("/V")] = create_string_object(str(val))
                if "/AP" in annot:
                    del annot["/AP"]

    if "/AcroForm" in writer._root_object:
        writer._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def flatten_pdf(pdf_bytes: bytes) -> bytes:
    """Flatten AcroForm fields into static page content (non-editable).

    Strategy:
      1. pdftoppm renders pages to PNG — correctly preserves IRS form backgrounds.
      2. Fields that have /AP streams are rendered by pdftoppm automatically.
      3. Fields WITHOUT /AP (e.g. IRS calculated fields like Line 24, 37) are drawn
         directly onto the PNG using Pillow, reading coordinates from /Rect in the PDF.

    Requires: apt-get install -y poppler-utils fonts-liberation
              pip install img2pdf Pillow
    """
    import subprocess, tempfile, os, glob, img2pdf
    from PIL import Image, ImageDraw, ImageFont
    from pypdf import PdfReader as _R

    DPI    = 150
    SCALE  = DPI / 72.0  # PDF points → pixels

    # ── Collect fields that have /V but no /AP (pdftoppm cannot render them) ──
    reader   = _R(io.BytesIO(pdf_bytes))
    overlays = {}  # page_idx → [(px_x, px_y, value_str)]

    for pg_i, page in enumerate(reader.pages):
        h_pts = float(page.mediabox.height)
        for ref in page.get("/Annots", []):
            annot = ref.get_object()
            if annot.get("/Subtype") != "/Widget":
                continue

            # Skip if /AP already present (parent or self) — pdftoppm will render
            has_ap = "/AP" in annot
            if not has_ap and "/Parent" in annot:
                has_ap = "/AP" in annot["/Parent"].get_object()
            if has_ap:
                continue

            v = annot.get("/V")
            if not v:
                continue
            val = str(v).strip("() \t")
            # Skip empty, PDF name objects (/Yes, /Off), and checkbox literals
            if not val or val.startswith("/") or val.lower() in ("off", "yes", "no"):
                continue

            rect = annot.get("/Rect")
            if not rect:
                continue
            x1, y1, x2, y2 = (float(rect[i]) for i in range(4))
            # PDF origin is bottom-left; image origin is top-left
            px_x = int(x1 * SCALE) + 3
            px_y = int((h_pts - y2) * SCALE) + 3
            overlays.setdefault(pg_i, []).append((px_x, px_y, val))

    # ── Render PDF pages to PNG ───────────────────────────────────────────────
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as sf:
        sf.write(pdf_bytes)
        src = sf.name
    out_dir  = tempfile.mkdtemp()
    dst_path = src + "_flat.pdf"
    try:
        subprocess.run(
            ["pdftoppm", "-r", str(DPI), "-png", src, os.path.join(out_dir, "page")],
            check=True, capture_output=True
        )
        pages = sorted(glob.glob(os.path.join(out_dir, "*.png")))

        # ── Overlay missing field values using Pillow ─────────────────────────
        if overlays:
            # Try system monospace font; fall back to Pillow default
            _font_paths = [
                "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
                "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
            ]
            font = None
            for fp in _font_paths:
                try:
                    font = ImageFont.truetype(fp, 12)
                    break
                except Exception:
                    pass
            if font is None:
                try:
                    font = ImageFont.load_default(size=12)
                except Exception:
                    font = ImageFont.load_default()

            for i, png_path in enumerate(pages):
                if i not in overlays:
                    continue
                img  = Image.open(png_path).convert("RGB")
                draw = ImageDraw.Draw(img)
                for px_x, px_y, val in overlays[i]:
                    draw.text((px_x, px_y), val, fill=(0, 0, 0), font=font)
                img.save(png_path)

        with open(dst_path, "wb") as f:
            f.write(img2pdf.convert(pages))
        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(src)
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
# Field name reference (2024/2025 IRS Form 1040, verified via inspect_fields.py):
#
# Page 1 — Personal Info
# f1_01  Fiscal year begin (date)   f1_02  Fiscal year end (date)
# f1_03  Your first name & MI       f1_04  Your last name
# f1_05  Your SSN                   f1_06  Spouse first name & MI
# f1_07  Spouse last name           f1_08  Spouse SSN
# f1_09–f1_19  MFS/HOH name fields, digital assets, phone, email, etc.
#
# Address_ReadOrder group:
# f1_20  Street address             f1_21  Apt no
# f1_22  City                       f1_23  State        f1_24  ZIP
#
# Dependents table (each row: first name MI, last name, SSN, relationship):
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
# f1_67  Line 8   Additional income (Sch 1 — unemployment + other)
# f1_68  Line 9   Total income
# f1_69  Line 10  Adjustments (Sch 1)
# f1_70  Line 11  AGI
# f1_71  Line 12  Std/itemized deduction
# f1_72  Line 13  QBI deduction
# f1_73  Line 14  Add lines 12+13
# f1_74  Line 15  Taxable income
#
# Page 2
# f2_01  Line 16  Tax               f2_02  Line 17  AMT
# f2_03  Line 18  Add 16+17         f2_04  Line 19  Child tax credit
# f2_05  Line 20  Sch 3 credits     f2_06  Line 21  Total credits
# f2_07  Line 22  Tax minus credits f2_08  Line 23  Other taxes (Sch 2)
# f2_09  Line 24  Total tax
# f2_10  Line 25a W-2 withheld      f2_11  Line 25b 1099 withheld
# f2_12  Line 25c Other withheld    f2_13  Line 25d Total withheld
# f2_14  Line 26  Estimated pmts    f2_15  Line 27  EIC
# f2_22  SSN (signature area)
# f2_23  Line 34  Total payments    f2_24  Line 35a Refund
# f2_25  Line 36  Apply to next yr  f2_26  Line 37  Amount owed
# f2_32  Routing number             f2_33  Account number
#
# Filing status checkboxes (Page 1):
# c1_1–c1_3  Top-of-form checkboxes (fiscal/combat zone — not filing status)
# c1_4  Single          c1_5  Married filing jointly
# c1_6  MFS             c1_7  Head of household    c1_8  QSS
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

    # Build dependent fields (up to 4 dependents, 4 text fields each)
    dep_fields: dict = {}
    dep_bases = [31, 35, 39, 43]   # f1_31, f1_35, f1_39, f1_43
    deps = d.get("dependents") or []
    for dep, base in zip(deps[:4], dep_bases):
        if isinstance(dep, dict):
            fn  = dep.get("first_name", "")
            ln  = dep.get("last_name", "")
            ssn = dep.get("ssn", "")
            rel = dep.get("relationship", "")
        else:
            fn  = getattr(dep, "first_name", "")
            ln  = getattr(dep, "last_name", "")
            ssn = getattr(dep, "ssn", "")
            rel = getattr(dep, "relationship", "")
        dep_fields[f"f1_{base}[0]"]   = fn
        dep_fields[f"f1_{base+1}[0]"] = ln
        dep_fields[f"f1_{base+2}[0]"] = ssn
        dep_fields[f"f1_{base+3}[0]"] = rel

    fields = {
        # ── Personal Info ──────────────────────────────────────────────────
        "f1_03[0]": d.get("first_name", ""),
        "f1_04[0]": d.get("last_name", ""),
        "f1_05[0]": d.get("ssn", ""),
        "f1_06[0]": d.get("spouse_first_name") or "",
        "f1_07[0]": d.get("spouse_last_name") or "",
        "f1_08[0]": d.get("spouse_ssn") or "",

        # ── Filing Status ──────────────────────────────────────────────────
        "c1_4[0]": "/Yes" if fs == "single" else "/Off",
        "c1_5[0]": "/Yes" if fs == "married_joint" else "/Off",
        "c1_6[0]": "/Yes" if fs == "married_separate" else "/Off",
        "c1_7[0]": "/Yes" if fs == "head_household" else "/Off",
        "c1_8[0]": "/Off",

        # ── Address ────────────────────────────────────────────────────────
        "f1_20[0]": d.get("address", ""),
        "f1_21[0]": "",
        "f1_22[0]": d.get("city", ""),
        "f1_23[0]": d.get("state", ""),
        "f1_24[0]": d.get("zip_code", ""),

        # ── Income — Page 1 ────────────────────────────────────────────────
        "f1_47[0]": _f(c["wages_1a"]),           # 1a  W-2 wages
        "f1_48[0]": _f(c["wages_1b"]),           # 1b  household employee wages
        "f1_49[0]": _f(c["wages_1c"]),           # 1c  tip income
        "f1_50[0]": _f(c["wages_1d"]),           # 1d  Medicaid waiver
        "f1_51[0]": _f(c["wages_1e"]),           # 1e  dependent care benefits
        "f1_52[0]": _f(c["wages_1f"]),           # 1f  adoption benefits
        "f1_53[0]": _f(c["wages_1g"]),           # 1g  Form 8919 wages
        "f1_54[0]": _f(c["wages_1h"]),           # 1h  other earned income
        "f1_55[0]": _f(c["total_wages"]),        # 1z  total wages
        "f1_56[0]": _f(c["tax_exempt_int"]),     # 2a  tax-exempt interest
        "f1_57[0]": _f(c["taxable_int"]),        # 2b  taxable interest
        "f1_58[0]": _f(c["qualified_divs"]),     # 3a  qualified dividends
        "f1_59[0]": _f(c["ordinary_divs"]),      # 3b  ordinary dividends
        "f1_60[0]": _f(c["ira_total"]),          # 4a  IRA distributions (total)
        "f1_61[0]": _f(c["ira_taxable"]),        # 4b  taxable IRA amount
        "f1_62[0]": _f(c["pensions_total"]),     # 5a  pensions/annuities total
        "f1_63[0]": _f(c["pensions_tax"]),       # 5b  taxable pensions
        "f1_64[0]": _f(c["ss_full"]),            # 6a  SS benefits (full)
        "f1_65[0]": _f(c["ss_taxable"]),         # 6b  taxable SS (85%)
        "f1_66[0]": _f(c["capital_gain"]),       # 7   capital gain/loss
        "f1_67[0]": _f(c["sched1_income"]),      # 8   additional income (Sch 1)
        "f1_68[0]": _f(c["total_income"]),       # 9   total income
        "f1_69[0]": _f(c["adj"]),                # 10  adjustments
        "f1_70[0]": _f(c["agi"]),                # 11  AGI
        "f1_71[0]": _f(c["ded"]),                # 12  std/itemized deduction
        "f1_73[0]": _f(c["ded"]),                # 14  add 12+13 (QBI=0, same as 12)
        "f1_74[0]": _f(c["taxable"]),            # 15  taxable income

        # ── Tax & Credits — Page 2 ─────────────────────────────────────────
        "f2_01[0]": _f(c["gross_tax"]),          # 16  tax
        "f2_03[0]": _f(c["gross_tax"]),          # 18  add 16+17 (AMT=0)
        "f2_04[0]": _f(c["child_cr"]),           # 19  child tax credit
        "f2_06[0]": _f(c["total_cr"]),           # 21  total credits
        "f2_07[0]": _f(c["tax_after_cr"]),       # 22  tax minus credits
        "f2_09[0]": _f(c["tax_liability"]),      # 24  total tax

        # ── Payments ────────────────────────────────────────────────────────
        "f2_10[0]": _f(c["fed_wh"]),             # 25a W-2 federal withholding
        "f2_13[0]": _f(c["fed_wh"]),             # 25d total withholding
        "f2_14[0]": _f(c["est_pmts"]),           # 26  estimated tax payments
        "f2_15[0]": _f(c["eic"]),                # 27  earned income credit
        "f2_23[0]": _f(c["total_pmts"]),         # 34  total payments

        # ── Refund / Amount Owed ────────────────────────────────────────────
        "f2_24[0]": _f(c["refund"]),             # 35a refund
        "f2_26[0]": _f(c["balance_due"]),        # 37  amount owed

        # ── Direct Deposit ──────────────────────────────────────────────────
        "f2_32[0]": d.get("refund_routing") or "",
        "f2_33[0]": d.get("refund_account") or "",

        # ── Page 2 SSN (signature area) ─────────────────────────────────────
        "f2_22[0]": d.get("ssn", ""),

        # ── Paid Preparer Use Only ────────────────────────────────────────────
        "f2_41[0]": "TaxRefundLoan.us",
        "f2_42[0]": "PENDING",            # PTIN — update when IRS registration complete
        "f2_43[0]": "TaxRefundLoan.us",
        "f2_46[0]": "",
    }

    fields.update(dep_fields)
    return _fill_pdf(pdf_path, fields)
