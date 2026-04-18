SE_TAX_RATE = 0.1413  # 14.13% self-employment tax (after 50% deduction)
CORPORATE_TAX_RATE = 0.21

# 2024 Federal Tax Brackets
TAX_BRACKETS = {
    "single": [
        (11600,        0.10),
        (47150,        0.12),
        (100525,       0.22),
        (191950,       0.24),
        (243725,       0.32),
        (609350,       0.35),
        (float("inf"), 0.37),
    ],
    "married_joint": [
        (23200,        0.10),
        (94300,        0.12),
        (201050,       0.22),
        (383900,       0.24),
        (487450,       0.32),
        (731200,       0.35),
        (float("inf"), 0.37),
    ],
    "head_household": [
        (16550,        0.10),
        (63100,        0.12),
        (100500,       0.22),
        (191950,       0.24),
        (243700,       0.32),
        (609350,       0.35),
        (float("inf"), 0.37),
    ],
    "married_separate": [
        (11600,        0.10),
        (47150,        0.12),
        (100525,       0.22),
        (191950,       0.24),
        (243725,       0.32),
        (609350,       0.35),
        (float("inf"), 0.37),
    ],
}

STANDARD_DEDUCTION = {
    "single": 14600,
    "married_joint": 29200,
    "married_separate": 14600,
    "head_household": 21900,
}


def calculate_tax(taxable_income: float, filing_status: str) -> float:
    brackets = TAX_BRACKETS.get(filing_status, TAX_BRACKETS["single"])
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
    # Gross income — social security: 85% is taxable (simplified; actual depends on income level)
    total_income = (
        data.wages +
        data.interest +
        data.dividends +
        getattr(data, "unemployment_compensation", 0.0) +
        getattr(data, "ira_distributions", 0.0) +
        getattr(data, "social_security_benefits", 0.0) * 0.85 +
        data.other_income
    )

    # Above-the-line adjustments (reduce AGI before deductions)
    student_loan_adj = min(getattr(data, "student_loan_interest", 0.0), 2500.0)
    ira_adj = min(getattr(data, "ira_deduction", 0.0), 7000.0)
    adjusted_gross_income = max(0.0, total_income - student_loan_adj - ira_adj)

    if data.standard_deduction:
        deduction = float(STANDARD_DEDUCTION.get(data.filing_status, 14600))
    else:
        deduction = data.itemized_deductions

    taxable_income = max(0.0, adjusted_gross_income - deduction)
    gross_tax = calculate_tax(taxable_income, data.filing_status)

    total_credits = (
        getattr(data, "child_tax_credit", 0.0) +
        getattr(data, "earned_income_credit", 0.0) +
        getattr(data, "other_credits", 0.0)
    )
    tax_liability = max(0.0, gross_tax - total_credits)

    total_payments = (
        getattr(data, "federal_withholding", 0.0) +
        getattr(data, "estimated_tax_payments", 0.0)
    )

    refund = round(max(0.0, total_payments - tax_liability), 2)
    balance_due = round(max(0.0, tax_liability - total_payments), 2)

    return {
        "total_income": round(total_income, 2),
        "adjusted_gross_income": round(adjusted_gross_income, 2),
        "taxable_income": round(taxable_income, 2),
        "gross_tax": gross_tax,
        "total_credits": round(total_credits, 2),
        "tax_liability": round(tax_liability, 2),
        "total_payments": round(total_payments, 2),
        "refund": refund,
        "balance_due": balance_due,
        "tax_owed": round(tax_liability, 2),  # kept for backward compat
    }


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
        "tax_owed": 0.0,
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
        "tax_owed": 0.0,
        "refund": 0.0,
    }
