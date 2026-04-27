#!/usr/bin/env python3
"""IRS Schedule 8812 (Form 1040) — 2024 — Credits for Qualifying Children
and Other Dependents.

Usage: python scripts/generate_schedule_8812.py data.json out.pdf

Note: f8812.pdf uses 'p1-tN' / 'p2-tN' field naming, NOT the 'f1_NN' convention
used by other schedules. Field-to-line mapping inferred from 2024 form layout;
verify visually before relying on it.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f8812.pdf"

# Header — page 1
HDR = {"name": "p1-t1[0]", "ssn": "p1-t4[0]"}

# Part I — Child Tax Credit (page 1)
LINES_P1 = {
    "line_1":  "p1-t5[0]",   # AGI from 1040 line 11
    "line_2a": "p1-t6[0]",   # Income from PR
    "line_2b": "p1-t7[0]",   # Income from 2555
    "line_2c": "p1-t8[0]",   # Income from 4563
    "line_2d": "p1-t9[0]",   # Add 2a-2c
    "line_3":  "p1-t10[0]",  # Add 1 + 2d
    "line_4":  "p1-t11[0]",  # Number of qualifying children × $2,000
    "line_5":  "p1-t12[0]",  # Multiply line 4 × $2,000
    "line_6":  "p1-t13[0]",  # Number of other dependents
    "line_7":  "p1-t14[0]",  # Multiply line 6 × $500
    "line_8":  "p1-t15[0]",  # Add line 5 + 7
    "line_9":  "p1-t16[0]",  # Filing status threshold ($400k MFJ / $200k other)
    "line_10": "p1-t17[0]",  # Subtract 9 from 3
    "line_11": "p1-t18[0]",  # Multiply line 10 × 5%
    "line_12": "p1-t19[0]",  # Smaller of 8 or (8-11)
    "line_13": "p1-t20[0]",  # Credit limit (worksheet A)
    "line_14": "p1-t21[0]",  # Smaller of 12 or 13 — CTC for 1040 line 19
    # Part II-A — Additional CTC
    "line_15": "p1-t22[0]",  # Check box if not claiming ACTC
    "line_16a":"p1-t23[0]",  # Subtract line 14 from line 12
    "line_16b":"p1-t24[0]",  # Number of qualifying children × $1,700 (2024 cap)
    "line_17": "p1-t25[0]",  # Smaller of 16a or 16b
    "line_18a":"p1-t26[0]",  # Earned income (worksheet B)
    "line_18b":"p1-t27[0]",  # Nontaxable combat pay
    "line_19": "p1-t28[0]",  # Is line 18a more than $2,500
    "line_20": "p1-t29[0]",  # Subtract $2,500 from 18a × 15%
    "line_21": "p1-t30[0]",  # 3+ qualifying children path
    "line_22": "p1-t31[0]",  # Smaller of 17 or 20
    "line_27": "p1-t32[0]",  # Additional CTC — flows to 1040 line 28
}
# Page 1 ACTC checkboxes
NOT_CLAIMING_ACTC = "p2-cb2"   # bizarre naming, but listed under Page1
PR_RESIDENT       = "p2-cb4"

# Page 2 — Line 4a Earned Income Worksheet (subform fields)
P2_EIC_WORKSHEET = {
    "ws_a_earned_income":  "p2-t1[0]",
    "ws_a_subtract":       "p2-t2[0]",
    "ws_a_add_nontaxable": "p2-t3[0]",
    "ws_a_total":          "p2-t4[0]",
}
PR_BONA_FIDE_YES = "c2_1[0]"
PR_BONA_FIDE_NO  = "c2_1[1]"


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    s8812 = data.get("schedule_8812", {})
    out = {}
    out[HDR["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[HDR["ssn"]]  = ssn(f1.get("ssn"))
    for k, fn in LINES_P1.items():
        if s8812.get(k) is not None:
            out[fn] = money(s8812[k]) if not k.startswith("line_15") else (True if s8812[k] else "")
    if s8812.get("not_claiming_actc"): out[NOT_CLAIMING_ACTC] = True
    if s8812.get("pr_resident"):       out[PR_RESIDENT] = True
    for k, fn in P2_EIC_WORKSHEET.items():
        if s8812.get(k) is not None:
            out[fn] = money(s8812[k])
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_8812.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule 8812 written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
