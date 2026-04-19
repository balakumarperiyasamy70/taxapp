from fpdf import FPDF
from pypdf import PdfWriter, PdfReader
import json
import io
from datetime import datetime

RETURN_LABELS = {
    "4868": "Form 4868 - Extension of Time to File",
    "1040": "Form 1040 - U.S. Individual Income Tax Return",
    "schedule_c": "Schedule C - Profit or Loss from Business",
    "1120s": "Form 1120-S - U.S. Income Tax Return for an S Corporation",
    "1065": "Form 1065 - U.S. Return of Partnership Income",
}

FIELD_LABELS = {
    # Common
    "tax_year": "Tax Year",
    "first_name": "First Name", "last_name": "Last Name",
    "ssn": "Social Security Number", "ein": "EIN",
    "address": "Address", "city": "City", "state": "State", "zip_code": "ZIP Code",
    # 4868
    "estimated_tax": "Estimated Tax Liability ($)",
    "tax_payments": "Tax Payments Made ($)",
    "balance_due": "Balance Due ($)",
    "dob": "Date of Birth", "pin": "Self-Select PIN",
    "prev_year_agi": "Prior Year AGI ($)",
    # 1040
    "filing_status": "Filing Status",
    "wages": "Wages ($)", "interest": "Interest Income ($)",
    "dividends": "Dividends ($)", "other_income": "Other Income ($)",
    "standard_deduction": "Standard Deduction Used",
    "itemized_deductions": "Itemized Deductions ($)",
    "child_tax_credit": "Child Tax Credit ($)",
    "earned_income_credit": "Earned Income Credit ($)",
    # Schedule C
    "business_name": "Business Name", "principal_business": "Principal Business",
    "gross_receipts": "Gross Receipts ($)", "returns_allowances": "Returns & Allowances ($)",
    "cost_of_goods": "Cost of Goods Sold ($)", "advertising": "Advertising ($)",
    "car_expenses": "Car & Truck Expenses ($)", "depreciation": "Depreciation ($)",
    "insurance": "Insurance ($)", "legal_professional": "Legal & Professional ($)",
    "office_expense": "Office Expense ($)", "rent_lease": "Rent or Lease ($)",
    "supplies": "Supplies ($)", "taxes_licenses": "Taxes & Licenses ($)",
    "travel": "Travel ($)", "utilities": "Utilities ($)",
    "wages": "Wages ($)", "other_expenses": "Other Expenses ($)",
    "home_office_deduction": "Home Office Deduction ($)",
    # 1120-S
    "corporation_name": "Corporation Name",
    "date_incorporated": "Date Incorporated", "state_incorporated": "State Incorporated",
    "total_assets": "Total Assets ($)", "compensation_officers": "Compensation of Officers ($)",
    "salaries_wages": "Salaries & Wages ($)", "repairs": "Repairs ($)",
    "bad_debts": "Bad Debts ($)", "rents": "Rents ($)", "interest": "Interest ($)",
    "advertising": "Advertising ($)", "other_deductions": "Other Deductions ($)",
    "shareholder_count": "Number of Shareholders", "ordinary_income": "Ordinary Income ($)",
    # 1065
    "partnership_name": "Partnership / LLC Name",
    "date_formed": "Date Formed", "state_formed": "State Formed",
    "guaranteed_payments": "Guaranteed Payments ($)", "partner_count": "Number of Partners",
}

SKIP_FIELDS = {"tax_year", "spouse_ssn", "spouse_first_name", "spouse_last_name",
               "spouse_phone", "spouse_pin", "spouse_dob", "spouse_prev_year_agi"}


class TaxPDF(FPDF):
    def header(self):
        self.set_fill_color(26, 26, 46)
        self.rect(0, 0, 210, 22, 'F')
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.set_xy(0, 5)
        self.cell(0, 12, 'TaxRefundLoan.us - Tax Document', align='C')
        self.set_text_color(0, 0, 0)
        self.ln(18)

    def footer(self):
        self.set_y(-12)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Generated {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")} | Page {self.page_no()} | TaxRefundLoan.us', align='C')


def _fmt_value(k: str, v) -> str:
    if isinstance(v, bool):
        return 'Yes' if v else 'No'
    if v is None or v == '' or v == 0 or v == 0.0:
        return '-'
    return str(v)


def generate_pdf(tax_return) -> bytes:
    form_data = json.loads(tax_return.form_data or '{}')
    return_label = RETURN_LABELS.get(tax_return.return_type, tax_return.return_type)

    pdf = TaxPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Return summary box
    pdf.set_fill_color(245, 245, 250)
    pdf.set_draw_color(200, 200, 210)
    pdf.rect(10, pdf.get_y(), 190, 38, 'FD')
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_xy(14, pdf.get_y() + 3)
    pdf.cell(0, 7, return_label)
    pdf.ln(8)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_x(14)
    pdf.cell(60, 6, f'Return ID: #{tax_return.id}')
    pdf.cell(60, 6, f'Tax Year: {tax_return.tax_year}')
    pdf.cell(60, 6, f'Status: {tax_return.status.upper()}')
    pdf.ln(7)
    pdf.set_x(14)
    pdf.cell(90, 6, f'Tax Owed: ${tax_return.tax_owed_cents / 100:,.2f}')
    pdf.cell(90, 6, f'Refund: ${tax_return.refund_amount_cents / 100:,.2f}')
    pdf.ln(7)
    pdf.set_x(14)
    filed = tax_return.created_at.strftime('%B %d, %Y') if tax_return.created_at else '—'
    pdf.cell(0, 6, f'Filed: {filed}')
    pdf.ln(14)

    # Form data fields
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_fill_color(230, 57, 70)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, '  Form Details', fill=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(10)

    pdf.set_font('Helvetica', '', 10)
    row = 0
    col_w = 95
    items = [(k, v) for k, v in form_data.items() if k not in SKIP_FIELDS]

    for i, (k, v) in enumerate(items):
        label = FIELD_LABELS.get(k, k.replace('_', ' ').title())
        value = _fmt_value(k, v)
        col = i % 2
        if col == 0:
            pdf.set_x(10)
            if i > 0:
                pdf.ln(0)
            if row % 2 == 0:
                pdf.set_fill_color(250, 250, 252)
            else:
                pdf.set_fill_color(255, 255, 255)
        x = 10 + col * col_w
        y = pdf.get_y()
        pdf.set_xy(x, y)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(col_w, 7, f'  {label}', fill=True, border='L' if col == 0 else 0)
        pdf.set_xy(x, y + 7)
        pdf.set_font('Helvetica', '', 9)
        pdf.cell(col_w, 6, f'  {value}', fill=True)
        if col == 1:
            pdf.ln(13)
            row += 1
        elif i == len(items) - 1:
            pdf.ln(13)

    # Disclaimer
    pdf.ln(6)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 5,
        'This document is a copy of the information submitted through TaxRefundLoan.us. '
        'Keep this for your records. This is not an official IRS-stamped document.')

    return bytes(pdf.output())


def protect_pdf(pdf_bytes: bytes, password: str) -> bytes:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=password, owner_password=password + "_owner")
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def make_password(dob: str, ssn_or_ein: str) -> str:
    """Birth year + last 4 digits of SSN/EIN. e.g. 19901234"""
    try:
        dob = dob.strip()
        if len(dob) == 10 and dob[4] == '-':   # YYYY-MM-DD
            birth_year = dob[:4]
        elif '/' in dob:                         # MM/DD/YYYY
            birth_year = dob.split('/')[-1]
        else:
            birth_year = dob[:4] if len(dob) >= 4 else "0000"
    except Exception:
        birth_year = "0000"
    digits = ssn_or_ein.replace('-', '').replace(' ', '')
    last4 = digits[-4:] if len(digits) >= 4 else digits.zfill(4)
    return f"{birth_year}{last4}"
