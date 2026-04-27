#!/usr/bin/env python3
"""IRS Schedule B (Form 1040) — 2024 — Interest and Ordinary Dividends.

Usage: python scripts/generate_schedule_b.py data.json out.pdf

Interest payers (Part I): up to 14 rows. Each row = (payer_name, amount).
Dividend payers (Part II): up to 16 rows.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040sb.pdf"

# Header
HDR = {"name": "f1_01[0]", "ssn": "f1_02[0]"}

# Part I — Interest. Row 1 payer name is in subform Line1_ReadOrder.f1_03.
# Subsequent rows alternate name/amount in f1_04..f1_31 (14 rows × 2).
INTEREST_ROW1_NAME = "f1_03[0]"
# rows 1..14 amounts/names: name fields at odd indices, amounts at even
# Row 1: name=f1_03, amt=f1_04
# Row 2: name=f1_05, amt=f1_06
# ...
# Row 14: name=f1_29, amt=f1_30
INTEREST_TOTAL = "f1_31[0]"   # Line 2 — total interest
LINE_3 = "f1_32[0]"           # Excludable savings bond interest (Form 8815)
LINE_4 = "f1_33[0]"           # Subtract line 3 from line 2 → flows to 1040 line 2b

# Part II — Ordinary Dividends. Row 1 name in ReadOrderControl.f1_34.
DIVIDEND_ROW1_NAME = "f1_34[0]"
# Row 1: name=f1_34, amt=f1_35; Row 2: name=f1_36, amt=f1_37; ... Row 16: f1_64, f1_65
DIVIDEND_TOTAL = "f1_66[0]"   # Line 6 — total → flows to 1040 line 3b

# Part III foreign accounts checkboxes
PART3_HAS_ACCOUNT_YES = "c1_1[0]"
PART3_HAS_ACCOUNT_NO  = "c1_1[1]"
PART3_FBAR_YES        = "c1_2[0]"
PART3_FBAR_NO         = "c1_2[1]"
PART3_TRUST_YES       = "c1_3[0]"
PART3_TRUST_NO        = "c1_3[1]"


def _interest_field(idx: int, kind: str) -> str:
    """idx 0..13, kind 'name' or 'amount'."""
    if idx == 0 and kind == "name":
        return INTEREST_ROW1_NAME
    base = 3 + idx * 2 + (0 if kind == "name" else 1)
    return f"f1_{base:02d}[0]"


def _dividend_field(idx: int, kind: str) -> str:
    """idx 0..15, kind 'name' or 'amount'."""
    base = 34 + idx * 2 + (0 if kind == "name" else 1)
    return f"f1_{base:02d}[0]"


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    sb = data.get("schedule_b", {})
    out = {
        HDR["name"]: f"{f1.get('first_name','')} {f1.get('last_name','')}".strip(),
        HDR["ssn"]:  ssn(f1.get("ssn")),
    }

    for i, row in enumerate(sb.get("interest", [])[:14]):
        out[_interest_field(i, "name")]   = row.get("payer", "")
        out[_interest_field(i, "amount")] = money(row.get("amount"))
    out[INTEREST_TOTAL] = money(sb.get("line_2_total_interest"))
    out[LINE_3]         = money(sb.get("line_3_excludable_savings"))
    out[LINE_4]         = money(sb.get("line_4_taxable_interest"))

    for i, row in enumerate(sb.get("dividends", [])[:16]):
        out[_dividend_field(i, "name")]   = row.get("payer", "")
        out[_dividend_field(i, "amount")] = money(row.get("amount"))
    out[DIVIDEND_TOTAL] = money(sb.get("line_6_total_dividends"))

    p3 = sb.get("part3", {})
    if p3.get("has_foreign_account") is True:  out[PART3_HAS_ACCOUNT_YES] = True
    if p3.get("has_foreign_account") is False: out[PART3_HAS_ACCOUNT_NO]  = True
    if p3.get("fbar_required") is True:  out[PART3_FBAR_YES] = True
    if p3.get("fbar_required") is False: out[PART3_FBAR_NO]  = True
    if p3.get("foreign_trust") is True:  out[PART3_TRUST_YES] = True
    if p3.get("foreign_trust") is False: out[PART3_TRUST_NO]  = True
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_b.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule B written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
