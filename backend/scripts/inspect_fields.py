#!/usr/bin/env python3
"""
Prints all AcroForm field names from an IRS PDF.
Run this on the VPS after downloading IRS forms to verify field names.

Usage:
    cd /opt/taxapp/backend
    source venv/bin/activate
    python3 scripts/inspect_fields.py app/forms/f1040.pdf
"""
import sys
from pypdf import PdfReader


def inspect(pdf_path: str):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    if not fields:
        print("No AcroForm fields found. This PDF may be XFA-based or not fillable.")
        return

    print(f"\nFile: {pdf_path}")
    print(f"Pages: {len(reader.pages)}  |  Total fields: {len(fields)}")
    print(f"\n{'Field Name':<50} {'Type':<12} {'Value'}")
    print("-" * 90)

    type_map = {'/Tx': 'Text', '/Btn': 'Button/Check', '/Ch': 'Choice/Select'}

    for name, field in sorted(fields.items()):
        ft = type_map.get(str(field.get('/FT', '')), str(field.get('/FT', '?')))
        fv = str(field.get('/V', ''))
        print(f"{name:<50} {ft:<12} {fv}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/inspect_fields.py <path_to_pdf>")
        print("Example: python3 scripts/inspect_fields.py app/forms/f1040.pdf")
        sys.exit(1)
    inspect(sys.argv[1])
