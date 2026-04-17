SE_TAX_RATE = 0.1413  # 14.13% self-employment tax (after 50% deduction)
CORPORATE_TAX_RATE = 0.21  # 21% flat C-Corp rate (1120-S passes through, no entity tax)


def calculate_schedule_c(data) -> dict:
    gross_profit = data.gross_receipts - data.returns_allowances - data.cost_of_goods
    total_expenses = (
        data.advertising + data.car_expenses + data.depreciation +
        data.insurance + data.legal_professional + data.office_expense +
        data.rent_lease + data.supplies + data.taxes_licenses +
        data.travel + data.utilities + data.wages +
        data.other_expenses + data.home_office_deduction
    )
    net_profit = gross_profit - total_expenses
    se_tax = max(0, net_profit) * SE_TAX_RATE
    se_deduction = se_tax / 2
    taxable_income = max(0, net_profit - se_deduction)
    return {
        "gross_profit": gross_profit,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "se_tax": round(se_tax, 2),
        "taxable_income": round(taxable_income, 2),
        "tax_owed": round(se_tax, 2),
        "refund": 0.0,
    }


def calculate_1120s(data) -> dict:
    gross_profit = data.gross_receipts - data.cost_of_goods
    total_deductions = (
        data.compensation_officers + data.salaries_wages + data.repairs +
        data.bad_debts + data.rents + data.taxes_licenses +
        data.interest + data.depreciation + data.advertising + data.other_deductions
    )
    ordinary_income = gross_profit - total_deductions
    return {
        "gross_profit": gross_profit,
        "total_deductions": total_deductions,
        "ordinary_income": round(ordinary_income, 2),
        "tax_owed": 0.0,  # S-Corp passes through to shareholders
        "refund": 0.0,
    }


def calculate_1065(data) -> dict:
    gross_profit = data.gross_receipts - data.cost_of_goods
    total_deductions = (
        data.salaries_wages + data.guaranteed_payments + data.repairs +
        data.bad_debts + data.rents + data.taxes_licenses +
        data.interest + data.depreciation + data.other_deductions
    )
    ordinary_income = gross_profit - total_deductions
    return {
        "gross_profit": gross_profit,
        "total_deductions": total_deductions,
        "ordinary_income": round(ordinary_income, 2),
        "tax_owed": 0.0,  # Partnership passes through to partners
        "refund": 0.0,
    }


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
