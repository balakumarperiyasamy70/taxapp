import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

interface Check {
  id: string
  category: string
  severity: "error" | "warning" | "info" | "ok"
  message: string
  detail?: string
  path?: string
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const taxReturn = await prisma.taxReturn.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      f1040: true,
      schedules: true,
      stateReturns: true,
    },
  })

  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const checks: Check[] = []
  const client = taxReturn.client
  const f1040 = taxReturn.f1040
  const schedules = taxReturn.schedules
  const personalInfo = (schedules.find(s => s.scheduleType === "PERSONAL_INFO")?.data as any) || {}
  const payments = (schedules.find(s => s.scheduleType === "PAYMENTS")?.data as any) || {}
  const health = (schedules.find(s => s.scheduleType === "HEALTH")?.data as any) || {}
  const stateReturn = taxReturn.stateReturns.find(s => s.stateCode === "AR")

  // ── PERSONAL INFO ──────────────────────────────────────
  if (!client.firstName || !client.lastName) {
    checks.push({ id: "pi-name", category: "Personal Info", severity: "error",
      message: "Taxpayer name is missing", detail: "First and last name are required.", path: "/basic-info/personal-info" })
  } else {
    checks.push({ id: "pi-name-ok", category: "Personal Info", severity: "ok", message: "Taxpayer name on file" })
  }

  if (!client.ssn) {
    checks.push({ id: "pi-ssn", category: "Personal Info", severity: "error",
      message: "Taxpayer SSN is missing", detail: "Social Security Number is required for all filers.", path: "/basic-info/personal-info" })
  } else if (client.ssn.replace(/\D/g,"").length !== 9) {
    checks.push({ id: "pi-ssn-inv", category: "Personal Info", severity: "error",
      message: "Taxpayer SSN appears invalid", detail: "SSN must be 9 digits.", path: "/basic-info/personal-info" })
  } else {
    checks.push({ id: "pi-ssn-ok", category: "Personal Info", severity: "ok", message: "Taxpayer SSN on file" })
  }

  if (!client.address || !client.city || !client.state || !client.zip) {
    checks.push({ id: "pi-addr", category: "Personal Info", severity: "warning",
      message: "Taxpayer address is incomplete", detail: "Address is required for mailed returns and refund checks.", path: "/basic-info/personal-info" })
  } else {
    checks.push({ id: "pi-addr-ok", category: "Personal Info", severity: "ok", message: "Taxpayer address on file" })
  }

  if (!client.dob) {
    checks.push({ id: "pi-dob", category: "Personal Info", severity: "warning",
      message: "Date of birth is missing", detail: "Required to verify eligibility for certain credits.", path: "/basic-info/personal-info" })
  }

  // ── FILING STATUS ──────────────────────────────────────
  if (!f1040?.filingStatus) {
    checks.push({ id: "fs-missing", category: "Filing Status", severity: "error",
      message: "Filing status not selected", detail: "A filing status is required.", path: "/basic-info/filing-status" })
  } else {
    checks.push({ id: "fs-ok", category: "Filing Status", severity: "ok", message: `Filing status: ${f1040.filingStatus.replace(/_/g," ")}` })

    if (["MARRIED_FILING_JOINTLY","MARRIED_FILING_SEPARATELY"].includes(f1040.filingStatus)) {
      if (!f1040.spouseFirstName || !f1040.spouseLastName) {
        checks.push({ id: "fs-spouse-name", category: "Filing Status", severity: "error",
          message: "Spouse name is missing", detail: "Required for married filing status.", path: "/basic-info/personal-info" })
      }
      if (!f1040.spouseSsn) {
        checks.push({ id: "fs-spouse-ssn", category: "Filing Status", severity: "error",
          message: "Spouse SSN is missing", detail: "Required for married filing status.", path: "/basic-info/personal-info" })
      }
    }
  }

  // ── INCOME ─────────────────────────────────────────────
  if (!f1040?.totalIncome && Number(f1040?.totalIncome) !== 0) {
    checks.push({ id: "inc-missing", category: "Income", severity: "warning",
      message: "No income entered", detail: "If you have no income, make sure this is correct.", path: "/federal/income" })
  } else {
    checks.push({ id: "inc-ok", category: "Income", severity: "ok",
      message: `Total income: $${Number(f1040?.totalIncome).toLocaleString()}` })
  }

  if (f1040?.adjustedGrossIncome && Number(f1040?.adjustedGrossIncome) < 0) {
    checks.push({ id: "inc-neg-agi", category: "Income", severity: "warning",
      message: "Adjusted Gross Income is negative", detail: "Verify all income and deduction entries.", path: "/federal/income" })
  }

  // ── DEDUCTIONS ─────────────────────────────────────────
  if (!f1040?.standardDeduction && !f1040?.itemizedDeduction) {
    checks.push({ id: "ded-missing", category: "Deductions", severity: "warning",
      message: "No deduction selected", detail: "Standard or itemized deduction must be applied.", path: "/federal/deductions" })
  } else {
    const dedAmt = Number(f1040?.standardDeduction || f1040?.itemizedDeduction || 0)
    checks.push({ id: "ded-ok", category: "Deductions", severity: "ok",
      message: `Deduction: $${dedAmt.toLocaleString()}` })
  }

  // ── CREDITS & PAYMENTS ─────────────────────────────────
  if (!payments.federalWithheld && !payments.est_q1 && !payments.est_q2 && !payments.est_q3 && !payments.est_q4) {
    checks.push({ id: "pay-none", category: "Credits & Payments", severity: "info",
      message: "No federal payments entered", detail: "If no tax was withheld and no estimated payments made, verify this is correct.", path: "/federal/payments" })
  } else {
    const totalPay = (Number(payments.federalWithheld)||0) + (Number(payments.est_q1)||0) + (Number(payments.est_q2)||0) + (Number(payments.est_q3)||0) + (Number(payments.est_q4)||0)
    checks.push({ id: "pay-ok", category: "Credits & Payments", severity: "ok",
      message: `Total payments: $${totalPay.toLocaleString()}` })
  }

  // Check if refund or balance due is reasonable
  if (f1040?.refundOrOwed) {
    const row = Number(f1040.refundOrOwed)
    if (row > 10000) {
      checks.push({ id: "pay-large-refund", category: "Credits & Payments", severity: "warning",
        message: `Large refund of $${row.toLocaleString()}`, detail: "Verify withholding and payment amounts are correct." })
    } else if (row < -5000) {
      checks.push({ id: "pay-large-owed", category: "Credits & Payments", severity: "warning",
        message: `Large balance due of $${Math.abs(row).toLocaleString()}`, detail: "Verify all withholding and payments are entered." })
    }
  }

  // ── HEALTH INSURANCE ───────────────────────────────────
  if (!health.hadCoverageAllYear && !health.hadMarketplaceCoverage && !health.hasExemption) {
    checks.push({ id: "hi-missing", category: "Health Insurance", severity: "warning",
      message: "Health insurance status not confirmed", detail: "Please review the health insurance section.", path: "/health" })
  } else {
    checks.push({ id: "hi-ok", category: "Health Insurance", severity: "ok", message: "Health insurance status confirmed" })
  }

  // ── STATE RETURN ────────────────────────────────────────
  if (!stateReturn) {
    checks.push({ id: "st-missing", category: "State Return", severity: "warning",
      message: "Arkansas state return not started", detail: "If you are an Arkansas resident, complete the state return.", path: "/state" })
  } else {
    const sd = stateReturn.data as any
    if (!sd.filingStatus) {
      checks.push({ id: "st-fs", category: "State Return", severity: "error",
        message: "Arkansas filing status not selected", path: "/state" })
    } else {
      checks.push({ id: "st-ok", category: "State Return", severity: "ok",
        message: `AR return: ${sd.arRefundOrOwed >= 0 ? `Refund $${Math.abs(sd.arRefundOrOwed).toLocaleString()}` : `Owed $${Math.abs(sd.arRefundOrOwed).toLocaleString()}`}` })
    }
  }

  // ── E-FILE READINESS ───────────────────────────────────
  if (!client.email) {
    checks.push({ id: "ef-email", category: "E-file Readiness", severity: "warning",
      message: "No email address on file", detail: "IRS acknowledgment will be sent to this email.", path: "/basic-info/personal-info" })
  } else {
    checks.push({ id: "ef-email-ok", category: "E-file Readiness", severity: "ok", message: "Email address on file" })
  }

  if (!personalInfo.ipPin && !personalInfo.noIpPin) {
    checks.push({ id: "ef-ippin", category: "E-file Readiness", severity: "info",
      message: "IP PIN not entered", detail: "If the IRS issued you an IP PIN, enter it to prevent rejection.", path: "/basic-info/ip-pin" })
  }

  checks.push({ id: "ef-ready", category: "E-file Readiness", severity: "ok", message: "Return is ready for e-file submission" })

  const totalErrors = checks.filter(c => c.severity === "error").length
  const totalWarnings = checks.filter(c => c.severity === "warning").length
  const status = totalErrors > 0 ? "errors" : totalWarnings > 0 ? "warnings" : "pass"

  return NextResponse.json({
    data: { status, totalErrors, totalWarnings, checks }
  })
}
