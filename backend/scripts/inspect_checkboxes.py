"""
Print all checkbox (/Btn) widget names and their Y-positions from f1040.pdf.
This identifies the exact field names for filing status, digital assets,
account type, and any other checkbox groups.

Usage (on VPS):
    cd /opt/taxapp/backend
    venv/bin/python3 scripts/inspect_checkboxes.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pypdf import PdfReader
from app.services.pdf_filler import FORMS_DIR

pdf_path = FORMS_DIR / "f1040.pdf"
reader = PdfReader(str(pdf_path))

for pg_i, page in enumerate(reader.pages):
    h = float(page.mediabox.height)
    rows = []
    for ref in page.get("/Annots", []):
        annot = ref.get_object()
        if annot.get("/Subtype") != "/Widget":
            continue
        ft = str(annot.get("/FT", ""))
        if ft != "/Btn":
            continue
        t = annot.get("/T")
        if t is None:
            continue
        rect = annot.get("/Rect")
        y = round(float(rect[3]), 1) if rect else 0
        # Read default /V to see current state
        v = str(annot.get("/V", "/Off"))
        # Read /AS
        as_ = str(annot.get("/AS", ""))
        # Read on-state name from /AP[/N]
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
        else:
            on_state = "(no /AP)"
        # Parent /T if any
        parent_ref = annot.get("/Parent")
        parent_t = ""
        if parent_ref:
            p = parent_ref.get_object()
            pt = p.get("/T")
            if pt:
                parent_t = f"  parent={str(pt)}"
        rows.append((round(h - y, 1), str(t), v, on_state, parent_t))

    rows.sort()
    print(f"\n=== PAGE {pg_i+1} CHECKBOXES (top to bottom) ===")
    print(f"{'Y-from-top':>10}  {'Field /T':<22}  {'default /V':<12}  {'on-state':<12}  parent")
    print("-" * 80)
    for y_top, name, v, on, par in rows:
        print(f"{y_top:>10}  {name:<22}  {v:<12}  {on:<12}  {par}")
