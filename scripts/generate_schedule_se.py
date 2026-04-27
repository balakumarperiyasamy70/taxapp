#!/usr/bin/env python3
"""IRS Schedule SE (Form 1040) — 2024 — Self-Employment Tax.

Usage: python scripts/generate_schedule_se.py data.json out.pdf
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040sse.pdf"

HDR = {"name": "f1_1[0]", "ssn": "f1_2[0]"}
# Part I
LINES = {
    "line_1a": "f1_3[0]",   # Net farm profit (Sch F)
    "line_1b": "f1_4[0]",   # SS retirement/disability benefits — farm
    "line_2":  "f1_5[0]",   # Net non-farm profit (Sch C)
    "line_3":  "f1_6[0]",   # Combine 1a, 1b, 2
    "line_4a": "f1_7[0]",   # × 92.35%
    "line_4b": "f1_8[0]",   # Optional methods
    "line_4c": "f1_9[0]",   # Combine 4a + 4b
    "line_5a": "f1_10[0]",  # Church employee income (subform Line5a_ReadOrder)
    "line_5b": "f1_11[0]",  # × 92.35%
    "line_6":  "f1_12[0]",  # Add 4c + 5b
    "line_7":  "f1_13[0]",  # Maximum SS earnings (preset $168,600)
    "line_8a": "f1_14[0]",  # SS wages from W-2 (subform Line8a_ReadOrder)
    "line_8b": "f1_15[0]",  # Unreported tips
    "line_8c": "f1_16[0]",  # Wages from 8919
    "line_8d": "f1_17[0]",  # Add 8a-8c
    "line_9":  "f1_18[0]",  # Subtract 8d from 7
    "line_10": "f1_19[0]",  # Smaller of 6 or 9 × 12.4%
    "line_11": "f1_20[0]",  # Line 6 × 2.9%
    "line_12": "f1_21[0]",  # Add 10 + 11 → SE tax
    "line_13": "f1_22[0]",  # × 50% → deductible part (flows to Sch 1 line 15)
}
# Part I checkbox A — exempt from SE tax (4361)
EXEMPT_4361 = "c1_1[0]"

# Part II — Optional Methods (page 2, lines 14-17)
OPTIONAL = {
    "line_14": "f2_1[0]",
    "line_15": "f2_2[0]",
    "line_16": "f2_3[0]",
    "line_17": "f2_4[0]",
}


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    se = data.get("schedule_se", {})
    out = {}
    out[HDR["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[HDR["ssn"]]  = ssn(f1.get("ssn"))
    if se.get("exempt_4361"): out[EXEMPT_4361] = True
    for k, fn in {**LINES, **OPTIONAL}.items():
        if se.get(k) is not None:
            out[fn] = money(se[k])
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_se.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule SE written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
