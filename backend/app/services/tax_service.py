# 2024 tax brackets (single filer)
TAX_BRACKETS_SINGLE = [
    (11600,  0.10),
    (47150,  0.12),
    (100525, 0.22),
    (191950, 0.24),
    (243725, 0.32),
    (609350, 0.35),
    (float("inf"), 0.37),
]

STANDARD_DEDUCTION = {
    "single": 14600,
    "married_joint": 29200,
    "married_separate": 14600,
    "head_household": 21900,
}


def calculate_tax(taxable_income: float, filing_status: str) -> float:
    brackets = TAX_BRACKETS_SINGLE  # TODO: add other status brackets
    tax = 0.0
    prev = 0.0
    for ceiling, rate in brackets:
        if taxable_income <= prev:
            break
        taxable_in_bracket = min(taxable_income, ceiling) - prev
        tax += taxable_in_bracket * rate
        prev = ceiling
    return round(tax, 2)


def calculate_1040(data) -> dict:
    total_income = (
        data.wages + data.interest + data.dividends + data.other_income
    )

    if data.standard_deduction:
        deduction = STANDARD_DEDUCTION.get(data.filing_status, 14600)
    else:
        deduction = data.itemized_deductions

    taxable_income = max(0, total_income - deduction)
    gross_tax = calculate_tax(taxable_income, data.filing_status)

    credits = data.child_tax_credit + data.earned_income_credit
    tax_owed = max(0, gross_tax - credits)

    # Refund = payments already made - tax owed
    # For now assume no prior payments (will add withholding field later)
    refund = 0.0

    return {
        "total_income": total_income,
        "taxable_income": taxable_income,
        "gross_tax": gross_tax,
        "credits": credits,
        "tax_owed": tax_owed,
        "refund": refund,
    }
