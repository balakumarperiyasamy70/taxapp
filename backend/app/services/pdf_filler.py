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

    child_cr    = float(d.get("child_tax_credit") or 0)
    eic         = float(d.get("earned_income_credit") or 0)
    other_cr    = float(d.get("other_credits") or 0)
    non_ref_cr  = child_cr + other_cr   # EIC is refundable — not here

    tax_after_cr  = max(0.0, gross_tax - non_ref_cr)
    tax_liability = tax_after_cr

    total_pmts  = fed_wh + est_pmts + eic   # EIC is refundable → payment
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
        "child_cr": child_cr, "eic": eic, "non_ref_cr": non_ref_cr,
        "tax_after_cr": tax_after_cr, "tax_liability": tax_liability,
        "fed_wh": fed_wh, "est_pmts": est_pmts, "total_pmts": total_pmts,
        "refund": refund, "balance_due": balance_due,
    }


def _fill_pdf(pdf_path: Path, fields: dict) -> bytes:
    """Fill AcroForm fields by leaf /T name.

    Sets /V on every matching Widget annotation and sets NeedAppearances=True
    so Poppler/pdftoppm regenerates appearances from /V values.  For text
    fields the /AP stream is also deleted so flatten_pdf's Pillow overlay
    picks them up as a secondary rendering path.  Checkboxes keep /AP.
    """
    from pypdf.generic import NameObject, BooleanObject, create_string_object

    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)

    # Tell PDF renderers to regenerate appearances from /V values
    acroform = writer._root_object.get("/AcroForm")
    if acroform:
        acroform = acroform.get_object()
        acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

    # Callers use leaf names (e.g. "f1_04[0]"); strip any dotted prefix.
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
                # Auto-detect the checkbox's actual "on" state name from its /AP dict.
                # IRS PDFs use state names like "/1" or "/Yes" — reading it avoids hardcoding.
                if val not in ("/Off", ""):
                    ap = annot.get("/AP")
                    if ap:
                        ap_obj = ap.get_object()
                        n_dict = ap_obj.get("/N")
                        if n_dict:
                            n_obj = n_dict.get_object()
                            for k in n_obj.keys():
                                if str(k) != "/Off":
                                    val = str(k)
                                    break
                annot[NameObject("/V")]  = NameObject(val)
                annot[NameObject("/AS")] = NameObject(val)
            else:
                annot[NameObject("/V")] = create_string_object(str(val))
                if "/AP" in annot:
                    del annot["/AP"]

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

            # Skip if this widget has its own /AP — pdftoppm will render it.
            # Do NOT check parent: IRS name/address fields are children of ReadOrder
            # groups that have a parent /AP (border/shading). We deleted the child
            # /AP in _fill_pdf so pdftoppm cannot render the text; Pillow must do it.
            if "/AP" in annot:
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
# ALL field positions confirmed via probe_1040_fields.py on the actual 2025 IRS PDF.
#
# Page 1 Personal Info:
#   f1_14 first name  f1_15 last name  f1_16 SSN
#   f1_17 spouse first  f1_18 spouse last  f1_19 spouse SSN
# Address: f1_20 street  f1_21 apt  f1_22 city  f1_23 state  f1_24 ZIP
# Dependents: f1_31-f1_34 dep1 … f1_43-f1_46 dep4
# Income:
#   f1_47=1a  f1_48=1b  f1_49=1c  f1_50=1d  f1_51=1e  f1_52=1f  f1_53=1g
#   f1_54=1h-desc(skip)  f1_55=1h-amt  f1_56=1i-combat(skip)  f1_57=1z
#   f1_58=2a  f1_59=2b  f1_60=3a  f1_61=3b
#   f1_62=4a  f1_63=4b  f1_64=4-detail(skip)
#   f1_65=5a  f1_66=5b  f1_67=5-detail(skip)
#   f1_68=6a  f1_69=6b  f1_70=7a  f1_71=7-detail(skip)
#   f1_72=line8  f1_73=line9  f1_74=line10  f1_75=line11a(AGI)
# Page 2:
#   f2_01=11b(AGI)  f2_02=12e(ded)  f2_03=13a(QBI)  f2_04=13b  f2_05=14  f2_06=15
#   f2_07=16-form#(skip)  f2_08=16-tax  f2_09=17(Sch2)  f2_10=18
#   f2_11=19(child-cr)  f2_12=20(Sch3)  f2_13=21  f2_14=22  f2_15=23  f2_16=24
#   f2_17=25a  f2_18=25b  f2_19=25c  f2_20=25d  f2_21=26(est-pmts)
#   f2_22=qualifying-child-SSN(EIC section — skip)  f2_23=27a(EIC)
#   f2_24=28  f2_25=29  f2_26=30  f2_27=31  f2_28=32  f2_29=33(total-pmts)
#   f2_30=34  f2_31=35a(refund)  f2_32=routing  f2_33=account
#   f2_34=36  f2_35=37(owed)  f2_36=38(penalty)
#   f2_46=preparer-name  f2_47=PTIN  f2_48=firm-name
# Filing status checkboxes: c1_4=Single  c1_5=MFJ  c1_6=MFS  c1_7=HOH  c1_8=QSS
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
    dep_bases = [31, 35, 39, 43]
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
        # ── Personal Info (probe-confirmed: names at f1_14–f1_19) ──────────
        "f1_14[0]": d.get("first_name", ""),
        "f1_15[0]": d.get("last_name", ""),
        "f1_16[0]": d.get("ssn", ""),
        "f1_17[0]": d.get("spouse_first_name") or "",
        "f1_18[0]": d.get("spouse_last_name") or "",
        "f1_19[0]": d.get("spouse_ssn") or "",

        # ── Filing Status checkboxes ────────────────────────────────────────
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

        # ── Income Page 1 (probe-confirmed field positions) ─────────────────
        "f1_47[0]": _f(c["wages_1a"]),       # 1a  W-2 wages
        "f1_48[0]": _f(c["wages_1b"]),       # 1b  household employee wages
        "f1_49[0]": _f(c["wages_1c"]),       # 1c  tip income
        "f1_50[0]": _f(c["wages_1d"]),       # 1d  Medicaid waiver
        "f1_51[0]": _f(c["wages_1e"]),       # 1e  dependent care benefits
        "f1_52[0]": _f(c["wages_1f"]),       # 1f  adoption benefits
        "f1_53[0]": _f(c["wages_1g"]),       # 1g  Form 8919 wages
        # f1_54 = 1h description text — skip
        "f1_55[0]": _f(c["wages_1h"]),       # 1h  other earned income amount
        # f1_56 = 1i nontaxable combat pay — skip
        "f1_57[0]": _f(c["total_wages"]),    # 1z  total wages
        "f1_58[0]": _f(c["tax_exempt_int"]), # 2a  tax-exempt interest
        "f1_59[0]": _f(c["taxable_int"]),    # 2b  taxable interest
        "f1_60[0]": _f(c["qualified_divs"]), # 3a  qualified dividends
        "f1_61[0]": _f(c["ordinary_divs"]),  # 3b  ordinary dividends
        "f1_62[0]": _f(c["ira_total"]),      # 4a  IRA distributions total
        "f1_63[0]": _f(c["ira_taxable"]),    # 4b  taxable IRA
        # f1_64 = 4 detail field — skip
        "f1_65[0]": _f(c["pensions_total"]), # 5a  pensions total
        "f1_66[0]": _f(c["pensions_tax"]),   # 5b  taxable pensions
        # f1_67 = 5 detail field — skip
        "f1_68[0]": _f(c["ss_full"]),        # 6a  SS benefits
        "f1_69[0]": _f(c["ss_taxable"]),     # 6b  taxable SS
        "f1_70[0]": _f(c["capital_gain"]),   # 7a  capital gain/loss
        # f1_71 = 7 detail field — skip
        "f1_72[0]": _f(c["sched1_income"]),  # 8   additional income (Sch 1)
        "f1_73[0]": _f(c["total_income"]),   # 9   total income
        "f1_74[0]": _f(c["adj"]),            # 10  adjustments
        "f1_75[0]": _f(c["agi"]),            # 11a AGI

        # ── Tax & Credits Page 2 (probe-confirmed) ──────────────────────────
        "f2_01[0]": _f(c["agi"]),            # 11b AGI carry-over
        "f2_02[0]": _f(c["ded"]),            # 12e std/itemized deduction
        # f2_03=13a QBI → skip (QBI=0)
        # f2_04=13b → skip
        "f2_05[0]": _f(c["ded"]),            # 14  add 12+13 (QBI=0)
        "f2_06[0]": _f(c["taxable"]),        # 15  taxable income
        # f2_07=16 form# text → skip
        "f2_08[0]": _f(c["gross_tax"]),      # 16  tax
        # f2_09=17 Sch2 → skip
        "f2_10[0]": _f(c["gross_tax"]),      # 18  add 16+17 (Sch2=0)
        "f2_11[0]": _f(c["child_cr"]),       # 19  child tax credit
        # f2_12=20 Sch3 → skip
        "f2_13[0]": _f(c["non_ref_cr"]),     # 21  total non-refundable credits
        "f2_14[0]": _f(c["tax_after_cr"]),   # 22  tax minus credits
        # f2_15=23 other taxes → skip
        "f2_16[0]": _f(c["tax_liability"]),  # 24  total tax

        # ── Payments ────────────────────────────────────────────────────────
        "f2_17[0]": _f(c["fed_wh"]),         # 25a  W-2 withholding
        "f2_20[0]": _f(c["fed_wh"]),         # 25d  total withholding
        "f2_21[0]": _f(c["est_pmts"]),       # 26   estimated tax payments
        "f2_23[0]": _f(c["eic"]),            # 27a  earned income credit
        "f2_29[0]": _f(c["total_pmts"]),     # 33   total payments

        # ── Refund / Amount Owed ────────────────────────────────────────────
        "f2_31[0]": _f(c["refund"]),         # 35a  refund
        "f2_35[0]": _f(c["balance_due"]),    # 37   amount owed

        # ── Direct Deposit ──────────────────────────────────────────────────
        "f2_32[0]": d.get("refund_routing") or "",
        "f2_33[0]": d.get("refund_account") or "",

        # ── Paid Preparer Use Only ───────────────────────────────────────────
        "f2_46[0]": "TaxRefundLoan.us",
        "f2_47[0]": "PENDING",               # PTIN — update when IRS registration complete
        "f2_48[0]": "TaxRefundLoan.us",
    }

    fields.update(dep_fields)
    return _fill_pdf(pdf_path, fields)
