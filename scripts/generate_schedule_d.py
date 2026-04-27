#!/usr/bin/env python3
"""IRS Schedule D (Form 1040) — 2024 — Capital Gains and Losses.

Usage: python scripts/generate_schedule_d.py data.json out.pdf

Detail rows are typically on Form 8949; Schedule D summarizes by category.
This filler covers the summary lines only.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040sd.pdf"

# Header
HDR = {"name": "f1_1[0]", "ssn": "f1_2[0]"}
# Part III digital asset checkbox lives on page 1 next to header
DIGITAL_ASSET_YES = "c1_1[0]"
DIGITAL_ASSET_NO  = "c1_1[1]"

# Each summary row (1a, 1b, 2, 3, 8a, 8b, 9, 10) has 4 columns:
# (d) proceeds, (e) cost basis, (g) adjustment, (h) gain/loss
# Field layout per row (subforms Table_PartI/Table_PartII):
ROWS = {
    "row_1a": ("f1_3[0]",  "f1_4[0]",  "f1_5[0]",  "f1_6[0]"),    # ST — totals from 1099-B w/o 8949
    "row_1b": ("f1_7[0]",  "f1_8[0]",  "f1_9[0]",  "f1_10[0]"),   # ST — Box A (8949)
    "row_2":  ("f1_11[0]", "f1_12[0]", "f1_13[0]", "f1_14[0]"),   # ST — Box B
    "row_3":  ("f1_15[0]", "f1_16[0]", "f1_17[0]", "f1_18[0]"),   # ST — Box C
    "row_8a": ("f1_23[0]", "f1_24[0]", "f1_25[0]", "f1_26[0]"),   # LT — totals from 1099-B w/o 8949
    "row_8b": ("f1_27[0]", "f1_28[0]", "f1_29[0]", "f1_30[0]"),   # LT — Box D
    "row_9":  ("f1_31[0]", "f1_32[0]", "f1_33[0]", "f1_34[0]"),   # LT — Box E
    "row_10": ("f1_35[0]", "f1_36[0]", "f1_37[0]", "f1_38[0]"),   # LT — Box F
}

OTHER = {
    "line_4":  "f1_19[0]",  # Short-term gain from 6252 / partnership
    "line_5":  "f1_20[0]",  # ST gain/loss from K-1s
    "line_6":  "f1_21[0]",  # ST capital loss carryover (negative)
    "line_7":  "f1_22[0]",  # Net ST gain/loss
    "line_11": "f1_39[0]",  # Gain from 4797
    "line_12": "f1_40[0]",  # LT gain/loss from K-1s
    "line_13": "f1_41[0]",  # Capital gain distributions
    "line_14": "f1_42[0]",  # LT capital loss carryover
    "line_15": "f1_43[0]",  # Net LT gain/loss
    # Page 2
    "line_16": "f2_1[0]",   # Combine lines 7 and 15
    "line_18": "f2_2[0]",   # 28% rate gain worksheet
    "line_19": "f2_3[0]",   # Unrecaptured Sec 1250 gain
    "line_21": "f2_4[0]",   # Allowed loss
}


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    sd = data.get("schedule_d", {})
    out = {}
    out[HDR["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[HDR["ssn"]]  = ssn(f1.get("ssn"))

    if sd.get("digital_asset") is True:  out[DIGITAL_ASSET_YES] = True
    if sd.get("digital_asset") is False: out[DIGITAL_ASSET_NO]  = True

    for row_key, fields in ROWS.items():
        row = sd.get(row_key)
        if not row:
            continue
        d, e, g, h = fields
        out[d] = money(row.get("proceeds"))
        out[e] = money(row.get("cost_basis"))
        out[g] = money(row.get("adjustment"))
        out[h] = money(row.get("gain_loss"))

    for key, fname in OTHER.items():
        v = sd.get(key)
        if v is not None:
            out[fname] = money(v)

    # Page 2 boxes for line 17/22 (yes/no flow checkboxes)
    if sd.get("line_17_both_gains") is True:  out["c2_1[0]"] = True
    if sd.get("line_17_both_gains") is False: out["c2_1[1]"] = True
    if sd.get("line_20_qdiv") is True:  out["c2_2[0]"] = True
    if sd.get("line_20_qdiv") is False: out["c2_2[1]"] = True
    if sd.get("line_22_qdiv") is True:  out["c2_3[0]"] = True
    if sd.get("line_22_qdiv") is False: out["c2_3[1]"] = True
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_d.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule D written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
