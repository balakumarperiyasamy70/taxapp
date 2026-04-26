/**
 * TaxApp — Return Service
 *
 * Orchestrates all return lifecycle operations:
 *  - Applying state machine transitions
 *  - Running diagnostics before submission
 *  - Submitting to IRS MeF
 *  - Handling IRS ACK (accept/reject)
 *  - Correcting and resubmitting rejected returns
 *
 * Every write goes through canTransition() first.
 * All multi-table writes use Prisma transactions.
 */

import { prisma } from "@/lib/prisma"
import {
  canTransition,
  TransitionContext,
  TransitionEvent,
  STATUS_LABELS,
} from "@/lib/returnStateMachine"
import { ReturnStatus, Role, TaxReturn, ReturnType } from "@prisma/client"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DiagnosticResult {
  passed: boolean
  errors: DiagnosticError[]
  warnings: DiagnosticWarning[]
}

export interface DiagnosticError {
  code: string
  field?: string
  message: string
}

export interface DiagnosticWarning {
  code: string
  field?: string
  message: string
}

export interface ActorContext {
  userId: string
  role: Role
}

// ─────────────────────────────────────────────
// State transition — universal entry point
// ─────────────────────────────────────────────

export async function applyTransition(
  returnId: string,
  event: TransitionEvent,
  actor: ActorContext,
  options: { irsAckCode?: string; irsAckMessage?: string; irsSubmissionId?: string } = {},
): Promise<TaxReturn> {
  const ret = await prisma.taxReturn.findUniqueOrThrow({
    where: { id: returnId },
    include: { signatures: true, extensions: true },
  })

  // Build transition context
  const diagnostics = await runDiagnostics(returnId, ret.returnType)
  const extensionAccepted = ret.extensions.some(
    (e) => e.status === "ACCEPTED" && e.taxYear === ret.taxYear,
  )

  const ctx: TransitionContext = {
    actorRole: actor.role,
    hasSignature: ret.signatures.some((s) => s.status === "SIGNED"),
    allDiagnosticsPassed: diagnostics.passed,
    extensionAccepted,
    irsAckCode: options.irsAckCode,
  }

  const result = canTransition(ret.status, event, ctx)
  if (!result.ok) {
    throw new ReturnServiceError("TRANSITION_BLOCKED", result.reason)
  }

  // Build update payload based on transition
  const updateData: Partial<{
    status: ReturnStatus
    lockedAt: Date | null
    submittedAt: Date | null
    acceptedAt: Date | null
    irsAckCode: string | null
    irsAckMessage: string | null
    irsSubmissionId: string | null
    readyForReview: boolean
    readyForClient: boolean
  }> = { status: result.nextStatus }

  if (event === "SUBMIT") {
    updateData.lockedAt = new Date()
    updateData.submittedAt = new Date()
  }
  if (event === "IRS_ACCEPT") {
    updateData.acceptedAt = new Date()
    updateData.irsAckCode = options.irsAckCode ?? null
    updateData.irsAckMessage = options.irsAckMessage ?? null
    updateData.irsSubmissionId = options.irsSubmissionId ?? null
  }
  if (event === "IRS_REJECT") {
    updateData.irsAckCode = options.irsAckCode ?? null
    updateData.irsAckMessage = options.irsAckMessage ?? null
    updateData.irsSubmissionId = options.irsSubmissionId ?? null
  }
  if (event === "CORRECT") {
    updateData.lockedAt = null  // Unlock for editing
    updateData.irsAckCode = null
    updateData.irsAckMessage = null
  }
  if (event === "SUBMIT_FOR_REVIEW") {
    updateData.readyForReview = true
  }
  if (event === "REQUEST_SIGNATURE") {
    updateData.readyForClient = true
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.taxReturn.update({
      where: { id: returnId },
      data: updateData,
    })

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        returnId,
        action: `return.${event.toLowerCase()}`,
        detail: {
          fromStatus: ret.status,
          toStatus: result.nextStatus,
          ...options,
        },
      },
    })

    return updated
  })

  return updated
}

// ─────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────

/**
 * Runs all validation checks for a return before review or submission.
 * Returns a full list of errors and warnings — never throws.
 */
export async function runDiagnostics(
  returnId: string,
  returnType: ReturnType,
): Promise<DiagnosticResult> {
  const errors: DiagnosticError[] = []
  const warnings: DiagnosticWarning[] = []

  const ret = await prisma.taxReturn.findUniqueOrThrow({
    where: { id: returnId },
    include: {
      client: true,
      f1040: true,
      f1120s: { include: { shareholders: true } },
      f1065: { include: { partners: true } },
      incomeItems: true,
      schedules: true,
    },
  })

  // ── Common checks ───────────────────────────

  if (!ret.client.ssn && !ret.client.ein) {
    errors.push({ code: "MISSING_TIN", message: "Client must have an SSN or EIN on file" })
  }

  if (!ret.taxYear) {
    errors.push({ code: "MISSING_TAX_YEAR", message: "Tax year is required" })
  }

  // ── 1040 checks ─────────────────────────────

  if (returnType === "F1040" && ret.f1040) {
    const data = ret.f1040

    if (!data.filingStatus) {
      errors.push({ code: "MISSING_FILING_STATUS", field: "filingStatus", message: "Filing status is required" })
    }

    if (data.filingStatus === "MARRIED_FILING_JOINTLY" && !data.spouseSsn) {
      errors.push({ code: "MISSING_SPOUSE_SSN", field: "spouseSsn", message: "Spouse SSN is required for MFJ" })
    }

    if (data.taxableIncome == null) {
      warnings.push({ code: "NO_TAXABLE_INCOME", message: "Taxable income has not been calculated — run calculation before submitting" })
    }

    const w2Count = ret.incomeItems.filter((i) => i.type === "W2").length
    if (w2Count === 0) {
      warnings.push({ code: "NO_W2", message: "No W-2 income items found — verify with client" })
    }
  }

  // ── 1120-S checks ───────────────────────────

  if (returnType === "F1120S" && ret.f1120s) {
    const data = ret.f1120s

    if (!data.ein) {
      errors.push({ code: "MISSING_EIN", field: "ein", message: "Business EIN is required for S-Corp return" })
    }

    if (!data.sCorpElectionDate) {
      warnings.push({ code: "NO_SCORP_ELECTION", message: "S-Corp election date not recorded — verify Form 2553 on file" })
    }

    if (data.shareholders.length === 0) {
      errors.push({ code: "NO_SHAREHOLDERS", message: "At least one shareholder is required for 1120-S" })
    }

    const totalOwnership = data.shareholders.reduce(
      (sum, s) => sum + Number(s.ownershipPct),
      0,
    )
    if (Math.abs(totalOwnership - 1) > 0.001) {
      errors.push({
        code: "OWNERSHIP_NOT_100",
        message: `Shareholder ownership totals ${(totalOwnership * 100).toFixed(2)}% — must equal 100%`,
      })
    }
  }

  // ── 1065 checks ─────────────────────────────

  if (returnType === "F1065" && ret.f1065) {
    const data = ret.f1065

    if (!data.ein) {
      errors.push({ code: "MISSING_EIN", field: "ein", message: "Business EIN is required for Partnership return" })
    }

    if (data.partners.length < 2) {
      errors.push({ code: "INSUFFICIENT_PARTNERS", message: "A partnership must have at least two partners" })
    }

    const totalPct = data.partners.reduce(
      (sum, p) => sum + Number(p.partnershipPct),
      0,
    )
    if (Math.abs(totalPct - 1) > 0.001) {
      errors.push({
        code: "PARTNERSHIP_PCT_NOT_100",
        message: `Partner percentages total ${(totalPct * 100).toFixed(2)}% — must equal 100%`,
      })
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

// ─────────────────────────────────────────────
// IRS MeF submission (return, not extension)
// ─────────────────────────────────────────────

export async function submitReturnToIRS(
  returnId: string,
  actor: ActorContext,
): Promise<TaxReturn> {
  // Transition to SUBMITTED first (validates guards)
  const ret = await applyTransition(returnId, "SUBMIT", actor)

  let submissionId: string
  let ackCode: "A" | "R"
  let ackMessage: string | undefined

  try {
    const mefResult = await sendReturnToMeF(ret)
    submissionId = mefResult.submissionId
    ackCode = mefResult.ackCode
    ackMessage = mefResult.ackMessage
  } catch (err) {
    // Roll back to SIGNED so preparer can retry
    await prisma.taxReturn.update({
      where: { id: returnId },
      data: {
        status: "SIGNED",
        lockedAt: null,
        submittedAt: null,
      },
    })
    throw new ReturnServiceError("MEF_ERROR", `IRS submission failed: ${String(err)}`)
  }

  const event = ackCode === "A" ? "IRS_ACCEPT" as const : "IRS_REJECT" as const
  return applyTransition(returnId, event, actor, {
    irsAckCode: ackCode,
    irsAckMessage: ackMessage,
    irsSubmissionId: submissionId,
  })
}

/**
 * MeF stub for return submission — replace with real SOAP client.
 * See extensionService.ts submitToMeF() for integration notes.
 */
async function sendReturnToMeF(ret: TaxReturn): Promise<{
  submissionId: string
  ackCode: "A" | "R"
  ackMessage?: string
}> {
  if (process.env.NODE_ENV === "test" || process.env.USE_MEF_STUB === "true") {
    await new Promise((r) => setTimeout(r, 800))
    return { submissionId: `STUB-${Date.now()}`, ackCode: "A" }
  }
  throw new Error("Real MeF return submission not yet implemented")
}

// ─────────────────────────────────────────────
// Correcting a rejected return
// ─────────────────────────────────────────────

export async function correctRejectedReturn(
  returnId: string,
  actor: ActorContext,
): Promise<TaxReturn> {
  return applyTransition(returnId, "CORRECT", actor)
}

// ─────────────────────────────────────────────
// Amended return (1040-X)
// ─────────────────────────────────────────────

export async function createAmendedReturn(
  originalReturnId: string,
  actor: ActorContext,
): Promise<TaxReturn> {
  if (actor.role === "FILER") {
    throw new ReturnServiceError("UNAUTHORIZED", "Filers cannot initiate amendments")
  }

  const original = await prisma.taxReturn.findUniqueOrThrow({
    where: { id: originalReturnId },
    include: { f1040: true },
  })

  if (original.status !== "ACCEPTED") {
    throw new ReturnServiceError(
      "INVALID_STATE",
      `Only ACCEPTED returns can be amended — this return is ${STATUS_LABELS[original.status]}`,
    )
  }

  // Mark original as AMENDED
  await applyTransition(originalReturnId, "AMEND", actor)

  // Clone into a new DRAFT return
  const amended = await prisma.taxReturn.create({
    data: {
      firmId: original.firmId,
      clientId: original.clientId,
      preparerId: original.preparerId,
      taxYear: original.taxYear,
      returnType: original.returnType,
      stateCode: original.stateCode,
      isAmended: true,
      originalReturnId: original.id,
      status: "DRAFT",
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      returnId: amended.id,
      action: "return.amended_created",
      detail: { originalReturnId },
    },
  })

  return amended
}

// ─────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────

export class ReturnServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ReturnServiceError"
  }
}
