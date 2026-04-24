"""
Probe each filing-status checkbox one at a time.
Produces 7 separate PDFs so you can open each and see which box gets checked.

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

# ── Step 1: dump ALL page-1 checkbox /T names and their on-states ─────────────
print("\n=== PAGE 1 CHECKBOX INVENTORY ===")
print(f"{'Y-from-top':>10}  {'Field /T':<22}  {'on-state':<12}  parent")
print("-" * 70)

reader = PdfReader(str(pdf_path))
page = reader.pages[0]
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
    rows.append((round(h - y, 1), str(t), on_state, parent_t))

rows.sort()
for y_top, name, on, par in rows:
    print(f"{y_top:>10}  {name:<22}  {on:<12}  {par}")

# ── Step 2: probe each candidate checkbox individually ────────────────────────
# These are the candidates we believe to be filing status checkboxes
candidates = [
    "c1_4[0]", "c1_4",
    "c1_5[0]", "c1_5",
    "c1_6[0]", "c1_6",
    "c1_7[0]", "c1_7",
    "c1_8[0]", "c1_8",
    "c1_8[1]",
    "c1_9[0]", "c1_9",
]

print("\n\n=== INDIVIDUAL CHECKBOX PROBE ===")
print("Each field set to its on-state. Open the PDF to see which box lights up.")

for field_name in candidates:
    reader2 = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader2)

    acroform = writer._root_object.get("/AcroForm")
    if acroform:
        acroform = acroform.get_object()
        acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

    base = field_name.split("[")[0]   # strip [0]/[1]

    hit = False
    for page in writer.pages:
        for ref in page.get("/Annots", []):
            annot = ref.get_object()
            if annot.get("/Subtype") != "/Widget":
                continue
            if str(annot.get("/FT", "")) != "/Btn":
                continue
            t = annot.get("/T")
            if t is None:
                continue
            # match both "c1_6" and "c1_6[0]"
            t_str = str(t)
            if t_str != field_name and t_str != base:
                continue
            # auto-detect on-state
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
        print(f"  {field_name:<15}  — NOT FOUND in annotations")
        continue

    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()
    pdf_bytes = flatten_pdf(pdf_bytes)

    safe = field_name.replace("[", "_").replace("]", "")
    out = f"/tmp/cb_test_{safe}.pdf"
    with open(out, "wb") as f:
        f.write(pdf_bytes)
    print(f"  {field_name:<15}  → {out}")

print("\nDone. Open each PDF and check which filing-status box is checked.")
