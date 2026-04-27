#!/usr/bin/env python3
"""IRS Schedule C (Form 1040) — 2024 — Profit or Loss From Business.

Usage: python scripts/generate_schedule_c.py data.json out.pdf
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pdf_filler import fill_acroform, money, ssn

TEMPLATE = Path(__file__).parent.parent / "templates" / "f1040sc.pdf"

# Header — Page 1
HDR = {
    "name":              "f1_1[0]",   # Name of proprietor
    "ssn":               "f1_2[0]",   # SSN
    "principal_business":"f1_3[0]",   # A — principal business
    "business_code":     "f1_4[0]",   # B — code (subform BComb)
    "business_name":     "f1_5[0]",   # C — business name
    "ein":               "f1_6[0]",   # D — EIN (subform DComb)
    "address":           "f1_7[0]",   # E — address
    "city_state_zip":    "f1_8[0]",   # E — city/state/zip
}
# F accounting method: c1_1[0]=cash, [1]=accrual, [2]=other (with f1_9)
ACCT_CASH    = "c1_1[0]"
ACCT_ACCRUAL = "c1_1[1]"
ACCT_OTHER   = "c1_1[2]"
ACCT_OTHER_DESC = "f1_9[0]"
# G — material participation: c1_2[0]=Yes, [1]=No
MAT_PART_YES = "c1_2[0]"
MAT_PART_NO  = "c1_2[1]"
# H — started/acquired during 2024: c1_3[0]
STARTED_2024 = "c1_3[0]"
# I — 1099 required: c1_4[0]=Yes, [1]=No
FORM1099_REQ_YES = "c1_4[0]"
FORM1099_REQ_NO  = "c1_4[1]"
# J — filed 1099: c1_5[0]=Yes, [1]=No
FORM1099_FILED_YES = "c1_5[0]"
FORM1099_FILED_NO  = "c1_5[1]"
# Line 1 statutory employee box: Line1_ReadOrder.c1_6[0]
STATUTORY_EMPLOYEE = "c1_6[0]"

# Part I — Income
INCOME = {
    "line_1":  "f1_10[0]",  # Gross receipts
    "line_2":  "f1_11[0]",  # Returns and allowances
    "line_3":  "f1_12[0]",  # Subtract 2 from 1
    "line_4":  "f1_13[0]",  # Cost of goods sold (from line 42)
    "line_5":  "f1_14[0]",  # Gross profit
    "line_6":  "f1_15[0]",  # Other income
    "line_7":  "f1_16[0]",  # Gross income
}

# Part II — Expenses (lines 8-17, Lines8-17 subform)
EXPENSES_8_17 = {
    "line_8":   "f1_17[0]",  # Advertising
    "line_9":   "f1_18[0]",  # Car/truck
    "line_10":  "f1_19[0]",  # Commissions/fees
    "line_11":  "f1_20[0]",  # Contract labor
    "line_12":  "f1_21[0]",  # Depletion
    "line_13":  "f1_22[0]",  # Depreciation
    "line_14":  "f1_23[0]",  # Employee benefit programs
    "line_15":  "f1_24[0]",  # Insurance
    "line_16a": "f1_25[0]",  # Mortgage interest
    "line_16b": "f1_26[0]",  # Other interest
    "line_17":  "f1_27[0]",  # Legal/professional
}
# Lines 18-27 subform
EXPENSES_18_27 = {
    "line_18":  "f1_28[0]",  # Office expense
    "line_19":  "f1_29[0]",  # Pension/profit-sharing
    "line_20a": "f1_30[0]",  # Rent — vehicles/machinery
    "line_20b": "f1_31[0]",  # Rent — other property
    "line_21":  "f1_32[0]",  # Repairs/maintenance
    "line_22":  "f1_33[0]",  # Supplies
    "line_23":  "f1_34[0]",  # Taxes/licenses
    "line_24a": "f1_35[0]",  # Travel
    "line_24b": "f1_36[0]",  # Deductible meals
    "line_25":  "f1_37[0]",  # Utilities
    "line_26":  "f1_38[0]",  # Wages
    "line_27a": "f1_39[0]",  # Other expenses (from Part V)
    "line_27b": "f1_40[0]",  # Reserved/energy efficient
}
TOTALS = {
    "line_28": "f1_41[0]",  # Total expenses
    "line_29": "f1_42[0]",  # Tentative profit/loss
    "line_30": "f1_43[0]",  # Home office expense (Form 8829) — also f1_44 simplified sqft
    "line_30_sqft_home":     "f1_43[0]",  # subform Line30_ReadOrder
    "line_30_sqft_business": "f1_44[0]",
    "line_31": "f1_45[0]",  # Net profit/loss
    "line_32": "f1_46[0]",  # If loss, check 32a or 32b
}
# Line 32 box: c1_7[0]=all investment at risk, [1]=some not
LINE_32A = "c1_7[0]"
LINE_32B = "c1_7[1]"


def build_fields(data: dict) -> dict:
    f1 = data.get("f1040", {})
    sc = data.get("schedule_c", {})
    out = {}
    out[HDR["name"]] = f"{f1.get('first_name','')} {f1.get('last_name','')}".strip()
    out[HDR["ssn"]]  = ssn(f1.get("ssn"))
    for key in ("principal_business", "business_code", "business_name", "ein", "address", "city_state_zip"):
        out[HDR[key]] = sc.get(key, "")

    method = sc.get("accounting_method")
    if method == "cash":    out[ACCT_CASH] = True
    if method == "accrual": out[ACCT_ACCRUAL] = True
    if method == "other":   out[ACCT_OTHER] = True; out[ACCT_OTHER_DESC] = sc.get("accounting_method_other","")

    if sc.get("material_participation") is True:  out[MAT_PART_YES] = True
    if sc.get("material_participation") is False: out[MAT_PART_NO]  = True
    if sc.get("started_2024"):                    out[STARTED_2024] = True
    if sc.get("form_1099_required") is True:  out[FORM1099_REQ_YES] = True
    if sc.get("form_1099_required") is False: out[FORM1099_REQ_NO]  = True
    if sc.get("form_1099_filed") is True:  out[FORM1099_FILED_YES] = True
    if sc.get("form_1099_filed") is False: out[FORM1099_FILED_NO]  = True
    if sc.get("statutory_employee"): out[STATUTORY_EMPLOYEE] = True

    for key, fname in {**INCOME, **EXPENSES_8_17, **EXPENSES_18_27, **TOTALS}.items():
        v = sc.get(key)
        if v is None:
            continue
        out[fname] = money(v) if not key.endswith("_sqft_home") and not key.endswith("_sqft_business") else str(v)

    risk = sc.get("line_32_risk")
    if risk == "all":  out[LINE_32A] = True
    if risk == "some": out[LINE_32B] = True

    # Part V — Other Expenses (up to 9 description/amount rows on page 2)
    for i, item in enumerate(sc.get("other_expenses", [])[:9]):
        desc_field = f"f2_{15 + i*2}[0]"   # f2_15, f2_17, f2_19, ... f2_31
        amt_field  = f"f2_{16 + i*2}[0]"   # f2_16, f2_18, f2_20, ... f2_32
        out[desc_field] = item.get("description", "")
        out[amt_field]  = money(item.get("amount"))
    out["f2_33[0]"] = money(sc.get("line_48_total_other_expenses"))

    # Part III — Cost of Goods Sold (page 2). Method box
    cogs_method = sc.get("cogs_method")
    # c2_1=cost, c2_2=lower of cost/market, c2_3=other
    if cogs_method == "cost":         out["c2_1[0]"] = True
    if cogs_method == "lcm":          out["c2_2[0]"] = True
    if cogs_method == "other":        out["c2_3[0]"] = True
    if sc.get("inventory_change") is True:  out["c2_4[0]"] = True
    if sc.get("inventory_change") is False: out["c2_4[1]"] = True

    cogs = sc.get("cogs", {})
    cogs_map = {
        "line_35": "f2_1[0]",   # Inventory at beginning of year
        "line_36": "f2_2[0]",   # Purchases
        "line_37": "f2_3[0]",   # Cost of labor
        "line_38": "f2_4[0]",   # Materials/supplies
        "line_39": "f2_5[0]",   # Other costs
        "line_40": "f2_6[0]",   # Add 35-39
        "line_41": "f2_7[0]",   # Inventory at end of year
        "line_42": "f2_8[0]",   # Cost of goods sold
    }
    for k, fn in cogs_map.items():
        if cogs.get(k) is not None:
            out[fn] = money(cogs[k])

    # Part IV — Vehicle (page 2)
    veh = sc.get("vehicle", {})
    if veh:
        out["f2_9[0]"]  = veh.get("date_in_service", "")    # line 43
        out["f2_10[0]"] = money(veh.get("business_miles"))  # line 44a
        out["f2_11[0]"] = money(veh.get("commuting_miles")) # line 44b
        out["f2_12[0]"] = money(veh.get("other_miles"))     # line 44c
        if veh.get("personal_use") is True:    out["c2_5[0]"] = True
        if veh.get("personal_use") is False:   out["c2_5[1]"] = True
        if veh.get("another_vehicle") is True: out["c2_6[0]"] = True
        if veh.get("another_vehicle") is False:out["c2_6[1]"] = True
        if veh.get("evidence") is True:        out["c2_7[0]"] = True
        if veh.get("evidence") is False:       out["c2_7[1]"] = True
        if veh.get("evidence_written") is True: out["c2_8[0]"] = True
        if veh.get("evidence_written") is False:out["c2_8[1]"] = True
    return out


def main():
    if len(sys.argv) != 3:
        print("Usage: generate_schedule_c.py <data.json> <out.pdf>"); sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    fill_acroform(str(TEMPLATE), build_fields(data), sys.argv[2])
    print(f"Schedule C written: {sys.argv[2]}")


if __name__ == "__main__":
    main()
