"""
Field probe — writes each field's own number as its value so we can read
the PDF and see exactly which f1_xx / f2_xx lands on which form line.

Usage (on VPS):
    cd /opt/taxapp/backend
    venv/bin/python3 scripts/probe_1040_fields.py

Output: /tmp/probe_1040.pdf

How to read the result:
  Personal info  — look for N03, N04 … N19 in the name/SSN rows
  Page 1 income  — look for 4700, 4800 … 8200 in the income lines
  Page 2         — look for 2001, 2002 … 2050 in the tax/payment lines
"""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject, create_string_object
from app.services.pdf_filler import FORMS_DIR, flatten_pdf

pdf_path = FORMS_DIR / "f1040.pdf"

reader = PdfReader(str(pdf_path))
writer = PdfWriter()
writer.append(reader)

acroform = writer._root_object.get("/AcroForm")
if acroform:
    acroform = acroform.get_object()
    acroform[NameObject("/NeedAppearances")] = BooleanObject(True)

# ── Build probe values ───────────────────────────────────────────────────────

probe = {}

# Personal info + address area (f1_03 through f1_19)
# Value = "N03", "N04" … easy to spot in name/SSN boxes
for n in range(3, 20):
    probe[f"f1_{n:02d}[0]"] = f"N{n:02d}"

# Page 1 income area (f1_47 through f1_82)
# Value = field_number × 100  →  f1_47 = "4700.00",  f1_56 = "5600.00" …
for n in range(47, 83):
    probe[f"f1_{n}[0]"] = f"{n * 100:.2f}"

# Page 2 — all fields f2_01 through f2_50
# Value = 2001.00, 2002.00 … so "2001" at line 11b means f2_01 = line 11b
for n in range(1, 51):
    probe[f"f2_{n:02d}[0]"] = f"{2000 + n:.2f}"

# ── Write values into annotations ────────────────────────────────────────────

leaf_map = {k.split(".")[-1]: v for k, v in probe.items()}

for page in writer.pages:
    for ref in page.get("/Annots", []):
        annot = ref.get_object()
        if annot.get("/Subtype") != "/Widget":
            continue
        t = annot.get("/T")
        if t is None:
            continue
        key = str(t)
        if key not in leaf_map:
            continue
        ft = str(annot.get("/FT", ""))
        if ft == "/Btn":
            continue  # skip checkboxes
        annot[NameObject("/V")] = create_string_object(leaf_map[key])
        if "/AP" in annot:
            del annot["/AP"]

buf = io.BytesIO()
writer.write(buf)
pdf_bytes = buf.getvalue()

print("Flattening probe PDF...")
pdf_bytes = flatten_pdf(pdf_bytes)

out = "/tmp/probe_1040.pdf"
with open(out, "wb") as f:
    f.write(pdf_bytes)

print(f"SUCCESS — probe PDF written to {out}")
