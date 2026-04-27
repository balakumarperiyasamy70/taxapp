#!/usr/bin/env python3
"""Dump AcroForm field names + types from any IRS PDF.

Usage: python scripts/inspect_pdf_fields.py templates/f1040s1.pdf
"""
import sys
from pypdf import PdfReader
from pypdf.generic import NameObject


FIELD_TYPES = {"/Tx": "text", "/Btn": "button", "/Ch": "choice", "/Sig": "signature"}


def inspect(path: str) -> None:
    reader = PdfReader(path)
    fields = reader.get_fields() or {}
    if not fields:
        print(f"No AcroForm fields found in {path}")
        return

    rows = []
    for name, obj in fields.items():
        ft = obj.get("/FT", "")
        kind = FIELD_TYPES.get(ft, ft or "?")
        value = obj.get("/V", "")
        rows.append((name, kind, str(value)[:30]))

    rows.sort(key=lambda r: r[0])
    name_w = max(len(r[0]) for r in rows)
    print(f"{path}  ({len(rows)} fields)\n")
    print(f"{'NAME'.ljust(name_w)}  TYPE       VALUE")
    print(f"{'-' * name_w}  ---------  -----")
    for name, kind, value in rows:
        print(f"{name.ljust(name_w)}  {kind.ljust(9)}  {value}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    inspect(sys.argv[1])
