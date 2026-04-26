#!/usr/bin/env python3
"""Generate Arkansas Form AR1000F PDF."""

import sys
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

W, H = letter

def fmt_money(val):
    if val is None or val == "" or val == 0:
        return ""
    try:
        n = float(val)
        return "" if n == 0 else f"{n:,.0f}"
    except:
        return ""

def generate_ar1000f(data: dict, output_path: str):
    c = canvas.Canvas(output_path, pagesize=letter)
    draw_ar_page1(c, data)
    c.showPage()
    c.save()

def draw_ar_page1(c, data):
    L = 0.75*inch
    R = W - 0.75*inch
    y = H - 0.6*inch

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(L, y, "AR1000F")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2.5*inch, y, "ARKANSAS INDIVIDUAL INCOME TAX RETURN")
    c.setFont("Helvetica", 9)
    c.drawRightString(R, y, "2025")
    y -= 0.2*inch
    c.setFont("Helvetica", 8)
    c.drawString(L, y, "Full Year Resident")
    c.line(L, y - 0.05*inch, R, y - 0.05*inch)

    y -= 0.3*inch
    # Name/SSN
    c.setFont("Helvetica-Bold", 8)
    c.drawString(L, y, "Your Name")
    c.drawString(3.5*inch, y, "Social Security Number")
    y -= 0.18*inch
    c.setFont("Helvetica", 10)
    fname = f"{data.get('firstName','') or ''} {data.get('lastName','') or ''}".strip()
    c.drawString(L, y, fname)
    ssn = data.get('ssn','') or ''
    if len(ssn) == 9:
        c.drawString(3.5*inch, y, f"{ssn[:3]}-{ssn[3:5]}-{ssn[5:]}")
    y -= 0.05*inch
    c.line(L, y, 3.3*inch, y)
    c.line(3.5*inch, y, R, y)

    y -= 0.25*inch
    state_data = data.get('stateData', {})

    # Filing Status
    c.setFont("Helvetica-Bold", 9)
    c.drawString(L, y, "Filing Status:")
    y -= 0.18*inch
    c.setFont("Helvetica", 8)
    statuses = [
        ("SINGLE", "1 ☐ Single"),
        ("MARRIED_FILING_JOINTLY", "2 ☐ Married Filing Jointly"),
        ("MARRIED_FILING_SEPARATELY", "3 ☐ Married Filing Separately"),
        ("HEAD_OF_HOUSEHOLD", "4 ☐ Head of Household"),
    ]
    filing = state_data.get('filingStatus', '') or data.get('filingStatus', '')
    x = L
    for val, label in statuses:
        checked_label = label.replace("☐", "☑") if filing == val else label
        c.drawString(x, y, checked_label)
        x += 1.5*inch
    y -= 0.25*inch
    c.line(L, y, R, y)

    # Income lines
    y -= 0.2*inch
    c.setFont("Helvetica-Bold", 9)
    c.drawString(L, y, "INCOME")
    y -= 0.18*inch

    ar_lines = [
        ("1", "Federal Adjusted Gross Income", state_data.get('federalAGI','')),
        ("2", "Additions to income", state_data.get('otherAdditions','')),
        ("3", "Total (add lines 1 and 2)", ''),
        ("4", "Subtractions from income", state_data.get('otherSubtractions','')),
        ("5", "Arkansas Adjusted Gross Income", state_data.get('arAGI','')),
        ("6", "Standard or Itemized Deductions", state_data.get('arDeduction','')),
        ("7", "AR Net Income (subtract line 6 from line 5)", state_data.get('arTaxableIncome','')),
        ("8", "Personal tax credits", state_data.get('personalCredits','')),
        ("9", "Arkansas Net Taxable Income (subtract line 8 from line 7)", state_data.get('arTaxableIncome','')),
        ("10", "Arkansas Income Tax", state_data.get('arGrossTax','')),
        ("11", "Tax Credits", state_data.get('otherCredits','')),
        ("12", "Arkansas Net Tax (subtract line 11 from line 10)", state_data.get('arNetTax','')),
        ("13", "AR Income Tax Withheld", state_data.get('arWithheld','')),
        ("14", "Estimated Tax Payments", state_data.get('arEstimatedPayments','')),
        ("15", "Total Payments (add lines 13 and 14)", state_data.get('arPayments','')),
        ("16", "OVERPAYMENT (if line 15 > line 12)", state_data.get('arRefundOrOwed','') if (float(state_data.get('arRefundOrOwed',0) or 0)) > 0 else ''),
        ("17", "BALANCE DUE (if line 12 > line 15)", abs(float(state_data.get('arRefundOrOwed',0) or 0)) if (float(state_data.get('arRefundOrOwed',0) or 0)) < 0 else ''),
    ]

    for line_no, label, val in ar_lines:
        if y < 1.5*inch:
            break
        bold = line_no in ("9","10","12","15","16","17")
        font = "Helvetica-Bold" if bold else "Helvetica"
        c.setFont(font, 8)
        c.drawString(L, y, f"{line_no}.  {label}")
        if val:
            c.setFont("Helvetica", 9)
            c.drawRightString(R, y, fmt_money(val))
        c.line(R - 1.3*inch, y - 3, R, y - 3)
        y -= 0.22*inch

    # Political checkoffs
    y -= 0.1*inch
    c.line(L, y, R, y)
    y -= 0.18*inch
    c.setFont("Helvetica-Bold", 8)
    c.drawString(L, y, "Political Checkoffs ($1 each reduces refund):")
    y -= 0.16*inch
    c.setFont("Helvetica", 8)
    checkoffs = [
        ("wildlifeCheckoff", "Game & Fish Wildlife"),
        ("childrenServicesCheckoff", "Children's Services"),
        ("veteransCheckoff", "Veterans Fund"),
        ("artsCheckoff", "Arts Council"),
        ("warMemorialCheckoff", "War Memorial"),
    ]
    x = L
    for key, label in checkoffs:
        checked = "☑" if state_data.get(key) else "☐"
        c.drawString(x, y, f"{checked} {label}")
        x += 1.2*inch

    # Signature
    y -= 0.4*inch
    c.line(L, y, R, y)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(L, y - 0.15*inch, "Sign Here")
    y -= 0.4*inch
    c.line(L + 0.5*inch, y, 4*inch, y)
    c.setFont("Helvetica", 7)
    c.drawString(L + 0.5*inch, y + 0.05*inch, "Your signature")
    c.line(4.2*inch, y, 5.5*inch, y)
    c.drawString(4.2*inch, y + 0.05*inch, "Date")
    c.line(5.7*inch, y, R, y)
    c.drawString(5.7*inch, y + 0.05*inch, "Occupation")

    c.setFont("Helvetica", 7)
    c.drawString(L, 0.5*inch, "AR1000F (2025)")
    c.drawRightString(R, 0.5*inch, "Arkansas Department of Finance and Administration")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate_ar1000f.py <data_json> <output_pdf>")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        data = json.load(f)
    generate_ar1000f(data, sys.argv[2])
    print(f"Generated: {sys.argv[2]}")
