#!/usr/bin/env python3
"""IRS Schedule 1 (Form 1040) — 2024 — Additional Income and Adjustments.

Usage: python scripts/generate_schedule1.py data.json out.pdf

Mappings below are based on the 2024 f1040s1.pdf field order. Verify by
running and visually checking the rendered PDF; if a value lands on the
wrong line, adjust the constant below — do not patch in callers.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040s1.pdf"

# Leaf field names (pdf_filler also accepts the full topmostSubform[0]... path).
# Page 1 — header + Part I (Additional Income)
HEADER = {
    "name": "f1_01[0]",
    "ssn":  "f1_02[0]",
}

# Part I lines
PART_I = {
    "line_1":   "f1_03[0]",  # Taxable refunds, credits, offsets of state/local income tax
    "line_2a":  "f1_04[0]",  # Alimony received
    "line_2b_date": "f1_05[0]",  # Date of original divorce decree
    "line_3":   "f1_06[0]",  # Business income/loss (Sch C)
    "line_4":   "f1_07[0]",  # Other gains/losses (Form 4797)
    "line_5":   "f1_08[0]",  # Rental real estate, royalties (Sch E)
    "line_6":   "f1_09[0]",  # Farm income/loss (Sch F)
    "line_7":   "f1_10[0]",  # Unemployment compensation
    "line_8a":  "f1_13[0]",  # Net operating loss (subform Line8a_ReadOrder)
    "line_8b":  "f1_12[0]",  # Gambling
    "line_8c":  "f1_14[0]",  # Cancellation of debt
    "line_8d":  "f1_15[0]",  # Foreign earned income exclusion (Form 2555)
    "line_8e":  "f1_16[0]",  # Income from Form 8853
    "line_8f":  "f1_17[0]",  # Income from Form 8889
    "line_8g":  "f1_18[0]",  # Alaska Permanent Fund dividends
    "line_8h":  "f1_19[0]",  # Jury duty pay
    "line_8i":  "f1_20[0]",  # Prizes and awards
    "line_8j":  "f1_21[0]",  # Activity not engaged in for profit income
    "line_8k":  "f1_22[0]",  # Stock options
    "line_8l":  "f1_23[0]",  # Rental of personal property (not for profit)
    "line_8m":  "f1_24[0]",  # Olympic & Paralympic medals/USOC prize money
    "line_8n":  "f1_25[0]",  # Section 951(a) inclusion
    "line_8o":  "f1_26[0]",  # Section 951A(a) GILTI inclusion
    "line_8p":  "f1_27[0]",  # Section 461(l) excess business loss adjustment
    "line_8q":  "f1_28[0]",  # Taxable distributions from ABLE account
    "line_8r":  "f1_29[0]",  # Scholarship and fellowship grants
    "line_8s":  "f1_30[0]",  # Nontaxable Medicaid waiver payments included as wages
    "line_8t":  "f1_31[0]",  # Pension/annuity from non-qualified deferred comp / 457
    "line_8u":  "f1_32[0]",  # Wages earned while incarcerated
    "line_8v":  "f1_33[0]",  # Digital assets received as ordinary income
    "line_8z_desc":   "f1_34[0]",   # Other income — description
    "line_8z_amount": "f1_35[0]",   # Other income — amount (subform Line8z_ReadOrder)
    "line_9":   "f1_36[0]",  # Total other income (sum 8a–8z)
    "line_10":  "f1_38[0]",  # Total Part I → flows to Form 1040 line 8
}

# Page 2 — Part II (Adjustments to Income)
PART_II = {
    "line_11":  "f2_01[0]",  # Educator expenses
    "line_12":  "f2_02[0]",  # Business expenses for reservists, performing artists, fee-basis officials
    "line_13":  "f2_03[0]",  # HSA deduction
    "line_14":  "f2_04[0]",  # Moving expenses (Armed Forces only)
    "line_15":  "f2_05[0]",  # Deductible part of self-employment tax (Sch SE)
    "line_16":  "f2_06[0]",  # SEP, SIMPLE, qualified plans
    "line_17":  "f2_07[0]",  # Self-employed health insurance deduction
    "line_18":  "f2_08[0]",  # Penalty on early withdrawal of savings
    "line_19a": "f2_09[0]",  # Alimony paid
    "line_19b_ssn":  "f2_10[0]",  # Recipient's SSN (subform Line19b_CombField)
    "line_19c_date": "f2_11[0]",  # Date of original divorce decree
    "line_20":  "f2_12[0]",  # IRA deduction
    "line_21":  "f2_13[0]",  # Student loan interest deduction
    "line_22":  "f2_14[0]",  # Reserved for future use
    "line_23":  "f2_15[0]",  # Archer MSA deduction
    "line_24a": "f2_16[0]",  # Jury duty pay returned (subform Line24a_ReadOrder)
    "line_24b": "f2_17[0]",  # Deductible expenses re: rental of personal property
    "line_24c": "f2_18[0]",  # Nontaxable amount of Olympic/Paralympic medals
    "line_24d": "f2_19[0]",  # Reforestation amortization & expenses
    "line_24e": "f2_20[0]",  # Repayment of supplemental unemployment benefits
    "line_24f": "f2_21[0]",  # Contributions to 501(c)(18)(D) pension plans
    "line_24g": "f2_22[0]",  # Contributions by chaplains to 403(b)
    "line_24h": "f2_23[0]",  # Attorney fees & court costs — discrimination suits
    "line_24i": "f2_24[0]",  # Attorney fees & court costs — IRS whistleblower / false claims
    "line_24j": "f2_25[0]",  # Housing deduction (Form 2555)
    "line_24k": "f2_26[0]",  # Excess deferrals
    "line_24z_desc":   "f2_28[0]",  # Other adjustments — description
    "line_24z_amount": "f2_27[0]",  # Other adjustments — amount (subform Line24z_ReadOrder)
    "line_25":  "f2_29[0]",  # Total other adjustments (sum 24a–24z)
    "line_26":  "f2_30[0]",  # Total Part II → flows to Form 1040 line 10
}


def build_fields(data: dict) -> dict:
    """Map taxpayer data dict → AcroForm field name → string value."""
    f1 = data.get("f1040", {})
    s1 = data.get("schedule1", {})
    fields: dict = {}

    fields[HEADER["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    fields[HEADER["ssn"]]  = ssn(f1.get("ssn"))

    part_i = s1.get("part1", {})
    for key, field_name in PART_I.items():
        v = part_i.get(key)
        if key.endswith("_date") or key.endswith("_desc"):
            fields[field_name] = str(v) if v else ""
        else:
            fields[field_name] = money(v)

    part_ii = s1.get("part2", {})
    for key, field_name in PART_II.items():
        v = part_ii.get(key)
        if key.endswith("_date") or key.endswith("_desc"):
            fields[field_name] = str(v) if v else ""
        elif key == "line_19b_ssn":
            fields[field_name] = ssn(v)
        else:
            fields[field_name] = money(v)

    return fields


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: generate_schedule1.py <data.json> <out.pdf>")
        sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule 1 written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
