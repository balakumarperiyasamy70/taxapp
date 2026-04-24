"""
Probe each filing-status checkbox one at a time + page 2 account type.
Produces separate PDFs so you can open each and see which box gets checked.

Usage (on VPS):
    cd /opt/taxapp/backend
    venv/bin/python3 scripts/probe_checkboxes.py

Output: /tmp/cb_test_*.pdf
"""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject
from app.services.pdf_filler import FORMS_DIR, flatten_pdf

pdf_path = FORMS_DIR / "f1040.pdf"
reader0 = PdfReader(str(pdf_path))


def _page_inventory(page_idx, label):
    page = reader0.pages[page_idx]
    h = float(page.mediabox.height)
    rows = []
    for ref in page.get("/Annots", []):
        annot = ref.get_object()
        if annot.get("/Subtype") != "/Widget":
            continue
        if str(annot.get("/FT", "")) != "/Btn":
            continue
        t = annot.get("/T")
        if t is None:
            continue
        rect = annot.get("/Rect")
        y = round(float(rect[3]), 1) if rect else 0
        v_default = str(annot.get("/V", "/Off"))
        on_state = "?"
        ap = annot.get("/AP")
        if ap:
            ap_obj = ap.get_object()
            n_dict = ap_obj.get("/N")
            if n_dict:
                n_obj = n_dict.get_object()
                for k in n_obj.keys():
                    if str(k) != "/Off":
                        on_state = str(k)
                        break
        parent_t = ""
        par_ref = annot.get("/Parent")
        if par_ref:
            p = par_ref.get_object()
            pt = p.get("/T")
            if pt:
                parent_t = str(pt)
        rows.append((round(h - y, 1), str(t), v_default, on_state, parent_t))

    rows.sort()
    print(f"\n=== {label} CHECKBOX INVENTORY ===")
    print(f"{'Y-from-top':>10}  {'Field /T':<22}  {'default/V':<12}  {'on-state':<12}  parent")
    print("-" * 80)
    for y_top, name, v, on, par in rows:
        print(f"{y_top:>10}  {name:<22}  {v:<12}  {on:<12}  {par}")


_page_inventory(0, "PAGE 1")
_page_inventory(1, "PAGE 2")


def _probe_one(field_name, page_idx=None):
    """Generate a flattened PDF with exactly one checkbox set to its on-state."""
    reader2 = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader2)

    acroform = writer._root_object.get("/AcroForm")
    if acroform:
        acroform = acroform.get_object()
        acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

    hit = False
    for pg_i, page in enumerate(writer.pages):
        if page_idx is not None and pg_i != page_idx:
            continue
        for ref in page.get("/Annots", []):
            annot = ref.get_object()
            if annot.get("/Subtype") != "/Widget":
                continue
            if str(annot.get("/FT", "")) != "/Btn":
                continue
            t = annot.get("/T")
            if t is None:
                continue
            if str(t) != field_name:
                continue
            on_state = None
            ap = annot.get("/AP")
            if ap:
                ap_obj = ap.get_object()
                n_dict = ap_obj.get("/N")
                if n_dict:
                    n_obj = n_dict.get_object()
                    for k in n_obj.keys():
                        if str(k) != "/Off":
                            on_state = str(k)
                            break
            actual = on_state or "/Yes"
            annot[NameObject("/V")]  = NameObject(actual)
            annot[NameObject("/AS")] = NameObject(actual)
            hit = True

    if not hit:
        print(f"  {field_name:<18}  — NOT FOUND")
        return

    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = flatten_pdf(buf.getvalue())
    safe = field_name.replace("[", "_").replace("]", "")
    out = f"/tmp/cb_test_{safe}.pdf"
    with open(out, "wb") as f:
        f.write(pdf_bytes)
    print(f"  {field_name:<18}  → {out}")


# ── Page 1: filing status candidates (Y=62 group + Y=74 + Y=146) ─────────────
print("\n\n=== FILING STATUS PROBE (page 1) ===")
for fn in ["c1_1[0]", "c1_2[0]", "c1_3[0]", "c1_4[0]", "c1_5[0]"]:
    _probe_one(fn, page_idx=0)

# ── Page 2: account type candidates ──────────────────────────────────────────
print("\n=== ACCOUNT TYPE PROBE (page 2) ===")
for fn in ["c2_17[0]", "c2_17[1]", "c2_18[0]", "c2_18[1]",
           "c2_1[0]", "c2_2[0]", "c2_3[0]", "c2_4[0]"]:
    _probe_one(fn, page_idx=1)

print("\nDone. Open each PDF and check which checkbox lights up.")
print("For filing status: look for Single / MFJ / MFS / HOH / QSS checkboxes.")
print("For account type:  look for Checking / Savings checkboxes.")
