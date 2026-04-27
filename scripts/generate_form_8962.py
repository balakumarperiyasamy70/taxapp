#!/usr/bin/env python3
"""IRS Form 8962 — 2024 — Premium Tax Credit (PTC).

Usage: python scripts/generate_form_8962.py data.json out.pdf
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f8962.pdf"

# Header
HDR = {"name": "f1_1[0]", "ssn": "f1_2[0]"}
# Top-of-form: spouse relief checkbox
RELIEF_BOX = "c1_1[0]"

# Part I — Annual Calculation (page 1)
PART_I = {
    "line_1":   "f1_3[0]",   # Tax family size
    "line_2a":  "f1_4[0]",   # Modified AGI — taxpayer
    "line_2b":  "f1_5[0]",   # Modified AGI — dependents
    "line_3":   "f1_6[0]",   # Household income
    "line_4":   "f1_7[0]",   # Federal poverty line
    "line_5":   "f1_8[0]",   # Household income as % of poverty (3 ÷ 4 × 100)
    "line_6":   "f1_9[0]",   # Reserved for future use
    "line_7":   "f1_10[0]",  # Applicable figure
    "line_8a":  "f1_11[0]",  # Annual contribution amount
    "line_8b":  "f1_12[0]",  # Monthly contribution amount
}
# Line 9 — alimony/Form 1095-A allocation Yes/No
LINE_9_YES = "c1_2[0]"
LINE_9_NO  = "c1_2[1]"
# Line 10 — annual vs monthly calc Yes/No
LINE_10_YES = "c1_4[0]"
LINE_10_NO  = "c1_4[1]"

# Part II — Annual Premium Tax Credit (line 11) — single row in Part2Table1.BodyRow1
ANNUAL_LINE_11 = {
    "annual_premium":            "f1_13[0]",  # 11(a)
    "annual_slcsp":              "f1_14[0]",  # 11(b)
    "annual_contribution":       "f1_15[0]",  # 11(c)
    "annual_max_assistance":     "f1_16[0]",  # 11(d) — (b) − (c)
    "annual_premium_assistance": "f1_17[0]",  # 11(e) — smaller of (a) or (d)
    "annual_aptc":               "f1_18[0]",  # 11(f)
}
# Lines 12-23 — monthly rows in Part2Table2.BodyRow1..BodyRow12
# Field offsets per month: starting at f1_19 (Jan), 6 fields per month.
# Jan: f1_19..f1_24, Feb: f1_25..f1_30, ..., Dec: f1_85..f1_90.
MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]


def _monthly_fields(idx: int) -> dict:
    base = 19 + idx * 6
    return {
        "premium":            f"f1_{base}[0]",
        "slcsp":              f"f1_{base+1}[0]",
        "contribution":       f"f1_{base+2}[0]",
        "max_assistance":     f"f1_{base+3}[0]",
        "premium_assistance": f"f1_{base+4}[0]",
        "aptc":               f"f1_{base+5}[0]",
    }


# Lines 24-26 totals
TOTALS = {
    "line_24": "f1_91[0]",  # Total premium tax credit (sum of e column)
    "line_25": "f1_92[0]",  # Advance payment of PTC (sum of f column)
    "line_26": "f1_93[0]",  # Net premium tax credit (24 − 25 if 24 > 25)
    "line_27": "f1_94[0]",  # Excess APTC (25 − 24 if 25 > 24)
    "line_28": "f1_95[0]",  # Repayment limitation
    "line_29": "f1_96[0]",  # Excess APTC repayment (smaller of 27 or 28)
}

# Part IV — Allocation of Policy Amounts (page 2). Up to 4 allocations,
# each row has SSN + months + allocation %.
ALLOC_BOX_YES = "c2_1[0]"
ALLOC_BOX_NO  = "c2_1[1]"


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    f8962 = data.get("form_8962", {})
    out = {}
    out[HDR["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[HDR["ssn"]]  = ssn(f1.get("ssn"))

    if f8962.get("relief_eligible"): out[RELIEF_BOX] = True
    for k, fn in PART_I.items():
        if f8962.get(k) is not None:
            out[fn] = money(f8962[k])

    if f8962.get("line_9") is True:  out[LINE_9_YES] = True
    if f8962.get("line_9") is False: out[LINE_9_NO]  = True
    if f8962.get("line_10") is True:  out[LINE_10_YES] = True
    if f8962.get("line_10") is False: out[LINE_10_NO]  = True

    annual = f8962.get("line_11", {})
    for k, fn in ANNUAL_LINE_11.items():
        if annual.get(k) is not None:
            out[fn] = money(annual[k])

    monthly = f8962.get("monthly", {})
    for i, m in enumerate(MONTHS):
        row = monthly.get(m, {})
        for col, fn in _monthly_fields(i).items():
            if row.get(col) is not None:
                out[fn] = money(row[col])

    for k, fn in TOTALS.items():
        if f8962.get(k) is not None:
            out[fn] = money(f8962[k])
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_form_8962.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Form 8962 written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
