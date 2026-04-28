import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomBytes } from "crypto"

const execAsync = promisify(exec)

const SCRIPTS: Record<string, { script: string; prefix: string }> = {
  "1040":         { script: "generate_1040.py",          prefix: "Form_1040" },
  "ar1000f":      { script: "generate_ar1000f.py",       prefix: "AR1000F" },
  "schedule1":    { script: "generate_schedule1.py",     prefix: "Schedule_1" },
  "schedule-a":   { script: "generate_schedule_a.py",    prefix: "Schedule_A" },
  "schedule-b":   { script: "generate_schedule_b.py",    prefix: "Schedule_B" },
  "schedule-c":   { script: "generate_schedule_c.py",    prefix: "Schedule_C" },
  "schedule-d":   { script: "generate_schedule_d.py",    prefix: "Schedule_D" },
  "schedule-se":  { script: "generate_schedule_se.py",   prefix: "Schedule_SE" },
  "schedule-8812":{ script: "generate_schedule_8812.py", prefix: "Schedule_8812" },
  "form-8962":    { script: "generate_form_8962.py",     prefix: "Form_8962" },
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const formType = searchParams.get("form") || "1040"
  const scriptInfo = SCRIPTS[formType]
  if (!scriptInfo) {
    return NextResponse.json({ error: `Unknown form type: ${formType}` }, { status: 400 })
  }

  const taxReturn = await prisma.taxReturn.findUnique({
    where: { id: params.id },
    include: {
      client: { include: { dependents: true } },
      f1040: true, schedules: true, stateReturns: true, incomeItems: true,
    },
  })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const client = taxReturn.client
  const f1040 = taxReturn.f1040
  const paymentsSchedule = taxReturn.schedules.find(s => s.scheduleType === "PAYMENTS")
  const personalSchedule = taxReturn.schedules.find(s => s.scheduleType === "PERSONAL_INFO")
  const deductionsSchedule = taxReturn.schedules.find(s => s.scheduleType === "DEDUCTIONS")
  const healthSchedule = taxReturn.schedules.find(s => s.scheduleType === "HEALTH")
  const stateReturn = taxReturn.stateReturns.find(s => s.stateCode === "AR")

  const personalInfo = (personalSchedule?.data as any) || {}
  const payments = (paymentsSchedule?.data as any) || {}
  const deductions = (deductionsSchedule?.data as any) || {}
  const health = (healthSchedule?.data as any) || {}

  // ─── Schedule data built from IncomeItem rows ───
  const items = taxReturn.incomeItems
  const num = (v: unknown) => Number(v ?? 0)

  // Schedule B — interest from F1099_INT, dividends from F1099_DIV
  const interestItems = items.filter(i => i.type === "F1099_INT")
  const dividendItems = items.filter(i => i.type === "F1099_DIV")
  const totalInterest = interestItems.reduce((s, i) => s + num(i.amount), 0)
  const totalDividends = dividendItems.reduce((s, i) => s + num(i.amount), 0)
  const schedule_b = {
    interest: interestItems.map(i => ({ payer: i.payerName || "", amount: num(i.amount) })),
    line_2_total_interest: totalInterest,
    line_4_taxable_interest: totalInterest,
    dividends: dividendItems.map(i => ({ payer: i.payerName || "", amount: num(i.amount) })),
    line_6_total_dividends: totalDividends,
    part3: { has_foreign_account: false, fbar_required: false, foreign_trust: false },
  }

  // Schedule C — first OTHER item flagged as schedule-c in boxData
  const scItem = items.find(i => i.type === "OTHER" && (i.boxData as any)?.formType === "schedule-c")
  const scBox = (scItem?.boxData as any) || {}
  const scNetProfit = num(scBox.netProfit ?? scItem?.amount)
  const scGross = num(scBox.grossReceipts ?? scItem?.amount)
  const scExpenses = num(scBox.totalExpenses)
  const schedule_c = scItem ? {
    principal_business: scBox.principalBusiness || "",
    business_code: scBox.businessCode || "",
    business_name: scBox.businessName || "",
    ein: scBox.ein || scItem.payerEin || "",
    address: scBox.address || "",
    city_state_zip: scBox.cityStateZip || "",
    accounting_method: scBox.accountingMethod || "cash",
    material_participation: scBox.materialParticipation ?? true,
    line_1: scGross,
    line_3: scGross,
    line_5: scGross,
    line_7: scGross,
    line_28: scExpenses,
    line_29: scNetProfit,
    line_31: scNetProfit,
    line_32_risk: "all",
  } : {}

  // Schedule SE — from Schedule C net profit
  const seBase = num(scNetProfit)
  const seNetEarnings = Math.round(seBase * 0.9235)
  const seTax = seNetEarnings <= 0 ? 0 : Math.round(seNetEarnings * 0.153)
  const seDeduction = Math.round(seTax / 2)
  const schedule_se = seBase > 0 ? {
    line_2: seBase, line_3: seBase, line_4a: seNetEarnings, line_4c: seNetEarnings,
    line_6: seNetEarnings, line_7: 168600, line_9: Math.max(0, 168600 - 0),
    line_10: Math.round(seNetEarnings * 0.124),
    line_11: Math.round(seNetEarnings * 0.029),
    line_12: seTax, line_13: seDeduction,
  } : {}

  // Schedule D — capital gains from OTHER items with boxData.term
  const cgItems = items.filter(i => i.type === "OTHER" && (i.boxData as any)?.term)
  const cgRow = (term: "short" | "long") => {
    const rows = cgItems.filter(i => (i.boxData as any).term === term)
    if (rows.length === 0) return null
    const sum = (key: string) => rows.reduce((s, i) => s + num((i.boxData as any)[key]), 0)
    return {
      proceeds: sum("proceeds"),
      cost_basis: sum("costBasis"),
      adjustment: sum("adjustment"),
      gain_loss: rows.reduce((s, i) => s + num((i.boxData as any).gainLoss ?? i.amount), 0),
    }
  }
  const stRow = cgRow("short")
  const ltRow = cgRow("long")
  const stGain = stRow?.gain_loss ?? 0
  const ltGain = ltRow?.gain_loss ?? 0
  const schedule_d = {
    digital_asset: false,
    ...(stRow ? { row_1b: stRow, line_7: stGain } : {}),
    ...(ltRow ? { row_8b: ltRow, line_15: ltGain } : {}),
    line_16: stGain + ltGain,
  }

  // Schedule A — itemized deductions from DEDUCTIONS schedule
  const agi = Number(f1040?.adjustedGrossIncome ?? 0)
  const sa_medical = num(deductions.medicalExpenses)
  const sa_medThreshold = Math.round(agi * 0.075)
  const sa_medDeduction = Math.max(0, sa_medical - sa_medThreshold)
  const sa_5a = num(deductions.stateLocalTax ?? deductions.salesTax)
  const sa_5b = num(deductions.realEstateTax)
  const sa_5c = num(deductions.personalPropertyTax)
  const sa_5d = sa_5a + sa_5b + sa_5c
  const sa_5e = Math.min(sa_5d, 10000)
  const sa_taxes = sa_5e + num(deductions.otherTaxes)
  const sa_8a = num(deductions.mortgageInterest1098)
  const sa_8b = num(deductions.mortgageInterestNot1098)
  const sa_8c = num(deductions.points)
  const sa_8e = sa_8a + sa_8b + sa_8c
  const sa_interest = sa_8e + num(deductions.investmentInterest)
  const sa_11 = num(deductions.cashGifts)
  const sa_12 = num(deductions.nonCashGifts)
  const sa_13 = num(deductions.giftCarryover)
  const sa_gifts = sa_11 + sa_12 + sa_13
  const sa_15 = num(deductions.casualtyLosses)
  const sa_16 = num(deductions.otherDeductions)
  const schedule_a = {
    line_1: sa_medical, line_2: agi, line_3: sa_medThreshold, line_4: sa_medDeduction,
    line_5a: sa_5a, line_5a_box: !!deductions.useSalesTax,
    line_5b: sa_5b, line_5c: sa_5c, line_5d: sa_5d, line_5e: sa_5e,
    line_6: num(deductions.otherTaxes), line_7: sa_taxes,
    line_8a: sa_8a, line_8b: sa_8b, line_8c: sa_8c, line_8e: sa_8e,
    line_9: num(deductions.investmentInterest), line_10: sa_interest,
    line_11: sa_11, line_12: sa_12, line_13: sa_13, line_14: sa_gifts,
    line_15: sa_15, line_16: sa_16,
    line_17: sa_medDeduction + sa_taxes + sa_interest + sa_gifts + sa_15 + sa_16,
  }

  // Schedule 8812 — Child Tax Credit. Classify dependents by age.
  const taxYear = taxReturn.taxYear
  const deps = taxReturn.client.dependents
  const ageAt = (dob: Date | null) => dob ? (taxYear - new Date(dob).getFullYear()) : 99
  const qualifyingChildren = deps.filter(d => ageAt(d.dob) < 17).length
  const otherDeps = deps.length - qualifyingChildren
  const filingStatus = f1040?.filingStatus || ""
  const ctcThreshold = filingStatus === "MARRIED_FILING_JOINTLY" ? 400000 : 200000
  const ctcLine5 = qualifyingChildren * 2000
  const ctcLine7 = otherDeps * 500
  const ctcLine8 = ctcLine5 + ctcLine7
  const ctcLine10 = Math.max(0, agi - ctcThreshold)
  const ctcLine11 = Math.ceil(ctcLine10 / 1000) * 50  // rounded up to nearest $1000, × 5%
  const ctcLine12 = Math.max(0, ctcLine8 - ctcLine11)
  const schedule_8812 = {
    line_1: agi, line_3: agi,
    line_4: qualifyingChildren, line_5: ctcLine5,
    line_6: otherDeps, line_7: ctcLine7,
    line_8: ctcLine8, line_9: ctcThreshold,
    line_10: ctcLine10, line_11: ctcLine11, line_12: ctcLine12,
  }

  // Form 8962 — Premium Tax Credit from HEALTH schedule
  const annualPremium = num(health.annualPremium)
  const annualSlcsp = num(health.annualSlcsp)
  const annualAptc = num(health.annualAptc)
  const familySize = num(health.familySize) || (1 + (filingStatus === "MARRIED_FILING_JOINTLY" ? 1 : 0) + deps.length)
  const form_8962 = {
    line_1: familySize, line_2a: agi, line_3: agi,
    line_4: num(health.povertyLine), line_5: num(health.povertyPct),
    line_7: num(health.applicableFigure), line_8a: num(health.annualContribution),
    line_11: {
      annual_premium: annualPremium,
      annual_slcsp: annualSlcsp,
      annual_contribution: num(health.annualContribution),
      annual_aptc: annualAptc,
    },
    line_24: num(health.totalPtc),
    line_25: annualAptc,
    line_26: Math.max(0, num(health.totalPtc) - annualAptc),
    line_27: Math.max(0, annualAptc - num(health.totalPtc)),
  }

  // Schedule 1 — combine business income, unemployment, SE deduction
  const unemployment = items
    .filter(i => i.type === "F1099_MISC" && (i.boxData as any)?.unemployment)
    .reduce((s, i) => s + num((i.boxData as any).unemployment), 0)
  const sch1Part1Total = scNetProfit + unemployment
  const schedule_1 = {
    part1: {
      line_3: scNetProfit,
      line_7: unemployment,
      line_10: sch1Part1Total,
    },
    part2: {
      line_15: seDeduction,
      line_26: seDeduction,
    },
  }

  const data = {
    firstName: client.firstName,
    mi: personalInfo.mi || "",
    lastName: client.lastName,
    ssn: client.ssn || "",
    address: client.address || personalInfo.address || "",
    city: client.city || personalInfo.city || "",
    state: client.state || personalInfo.state || "",
    zip: client.zip || personalInfo.zip || "",
    filingStatus: f1040?.filingStatus || "",
    spouseFirstName: f1040?.spouseFirstName || personalInfo.spouseFirstName || "",
    spouseLastName: f1040?.spouseLastName || personalInfo.spouseLastName || "",
    spouseSSN: f1040?.spouseSsn || personalInfo.spouseSSN || "",
    occupation: personalInfo.occupation || "",
    spouseOccupation: personalInfo.spouseOccupation || "",
    email: client.email || personalInfo.email || "",
    daytimePhone: client.phone || personalInfo.daytimePhone || "",
    digitalAssets: personalInfo.digitalAssets || false,
    isDependent: personalInfo.isDependent || false,
    isBlind: personalInfo.isBlind || false,
    spouseIsBlind: personalInfo.spouseIsBlind || false,
    taxYear: taxReturn.taxYear,
    dependents: [],
    f1040: {
      first_name: client.firstName,
      last_name: client.lastName,
      ssn: client.ssn || "",
      totalIncome: Number(f1040?.totalIncome || 0),
      adjustedGrossIncome: Number(f1040?.adjustedGrossIncome || 0),
      standardDeduction: Number(f1040?.standardDeduction || 0),
      itemizedDeduction: Number(f1040?.itemizedDeduction || 0),
      taxableIncome: Number(f1040?.taxableIncome || 0),
      totalTax: Number(f1040?.totalTax || 0),
      totalPayments: Number(f1040?.totalPayments || 0),
      refundOrOwed: Number(f1040?.refundOrOwed || 0),
    },
    payments: {
      federalWithheld: Number(payments.federalWithheld || 0),
      est_q1: Number(payments.est_q1 || 0),
      est_q2: Number(payments.est_q2 || 0),
      est_q3: Number(payments.est_q3 || 0),
      est_q4: Number(payments.est_q4 || 0),
      eic: Number(payments.eic || 0),
      additionalChildTax: Number(payments.additionalChildTax || 0),
      americanOpportunityCredit: Number(payments.americanOpportunityCredit || 0),
    },
    income: {},
    schedule_a,
    schedule_b,
    schedule_c,
    schedule_d,
    schedule_se,
    schedule_8812,
    form_8962,
    schedule1: schedule_1,
    stateData: (stateReturn?.data as any) || {},
    preparer: {
      name: process.env.FIRM_PREPARER_NAME || "",
      ptin: process.env.FIRM_PREPARER_PTIN || "",
      firmName: process.env.FIRM_NAME || "",
      address: process.env.FIRM_ADDRESS || "",
      ein: process.env.FIRM_EIN || "",
      phone: process.env.FIRM_PHONE || "",
    },
  }

  const token = randomBytes(8).toString("hex")
  const dataPath = join(tmpdir(), `taxreturn_${token}.json`)
  const pdfPath = join(tmpdir(), `taxreturn_${token}.pdf`)

  try {
    await writeFile(dataPath, JSON.stringify(data))

    const scriptPath = join(process.cwd(), "scripts", scriptInfo.script)

    // Use wsl python3 on Windows dev, python3 on Linux prod
    const isWindows = process.platform === "win32"
    const pythonCmd = isWindows
      ? `wsl python3 "$(wslpath '${scriptPath}')" "$(wslpath '${dataPath}')" "$(wslpath '${pdfPath}')"`
      : `python3 "${scriptPath}" "${dataPath}" "${pdfPath}"`

    await execAsync(pythonCmd)

    const pdfBuffer = await readFile(pdfPath)
    await Promise.all([unlink(dataPath), unlink(pdfPath)]).catch(() => {})

    const filename = `${scriptInfo.prefix}_${client.lastName}_${taxReturn.taxYear}.pdf`
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (err: any) {
    console.error("PDF generation error:", err)
    await Promise.all([unlink(dataPath), unlink(pdfPath)]).catch(() => {})
    return NextResponse.json({ error: "PDF generation failed", details: err.message }, { status: 500 })
  }
}
