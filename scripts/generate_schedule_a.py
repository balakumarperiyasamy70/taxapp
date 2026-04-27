#!/usr/bin/env python3
"""IRS Schedule A (Form 1040) — 2024 — Itemized Deductions.

Usage: python scripts/generate_schedule_a.py data.json out.pdf
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040sa.pdf"

# Schedule A 2024 — leaf field map. Subform fields use leaf name; the engine
# resolves them. Verify visually; tweak constants if a value lands wrong.
FIELDS = {
    "name":         "f1_1[0]",
    "ssn":          "f1_2[0]",
    # Medical and Dental Expenses
    "line_1":       "f1_3[0]",   # Medical/dental expenses
    "line_2":       "f1_4[0]",   # AGI from 1040 line 11
    "line_3":       "f1_5[0]",   # 7.5% of AGI
    "line_4":       "f1_6[0]",   # Medical deduction
    # Taxes You Paid
    "line_5a":      "f1_7[0]",   # State/local income OR sales tax
    "line_5a_box":  "c1_1[0]",   # Check if sales tax (else income tax)
    "line_5b":      "f1_8[0]",   # Real estate taxes
    "line_5c":      "f1_9[0]",   # Personal property taxes
    "line_5d":      "f1_10[0]",  # Add 5a-5c
    "line_5e":      "f1_11[0]",  # Smaller of 5d or $10,000
    "line_6":       "f1_12[0]",  # Other taxes
    "line_7":       "f1_13[0]",  # Total taxes (5e + 6)
    # Interest You Paid
    "line_8a":      "f1_14[0]",  # Home mortgage interest reported on 1098
    "line_8b":      "f1_16[0]",  # Home mortgage interest not on 1098 (subform)
    "line_8c":      "f1_15[0]",  # Points not reported on 1098
    "line_8e":      "f1_18[0]",  # Add 8a-8c
    "line_9":       "f1_19[0]",  # Investment interest
    "line_10":      "f1_20[0]",  # Total interest
    # Gifts to Charity
    "line_11":      "f1_21[0]",  # Gifts by cash or check
    "line_12":      "f1_22[0]",  # Other than cash
    "line_13":      "f1_23[0]",  # Carryover from prior year
    "line_14":      "f1_24[0]",  # Total gifts
    # Casualty and Theft, Other
    "line_15":      "f1_25[0]",  # Casualty/theft losses
    "line_16":      "f1_26[0]",  # Other itemized deductions
    "line_17":      "f1_27[0]",  # Total itemized deductions
    "line_18_box":  "c1_3[0]",   # Check if elect to itemize when less than standard
}


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    sa = data.get("schedule_a", {})
    out = {}
    out[FIELDS["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[FIELDS["ssn"]]  = ssn(f1.get("ssn"))
    for key, fname in FIELDS.items():
        if key in ("name", "ssn"):
            continue
        v = sa.get(key)
        if key.endswith("_box"):
            out[fname] = bool(v)
        else:
            out[fname] = money(v)
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_a.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule A written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
