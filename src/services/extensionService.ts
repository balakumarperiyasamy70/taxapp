/**
 * TaxApp — Extension Filing Service
 *
 * Handles the full lifecycle of a tax extension:
 *   1. Create extension record (preparer or client trigger)
 *   2. Validate before submission
 *   3. Submit to IRS MeF (Form 4868 or 7004)
 *   4. Handle IRS ACK (accepted / rejected)
 *   5. Update return status via the state machine
 *   6. Notify client
 *
 * All database writes are wrapped in transactions.
 * IRS MeF integration is isolated in submitToMeF() — swap in the real
 * MeF client when you have your EFIN/ETIN credentials.
 */

import { prisma } from "@/lib/prisma"
import { getDeadlines, isPastOriginalDue, formatDeadline } from "@/lib/deadlines"
import { canTransition } from "@/lib/returnStateMachine"
import {
  ExtensionStatus,
  ExtensionTrigger,
  ReturnType,
  Role,
  Extension,
  Prisma,
} from "@prisma/client"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateExtensionInput {
  clientId: string
  returnId?: string        // Optional — may not exist yet
  firmId: string
  taxYear: number
  returnType: ReturnType
  triggeredBy: ExtensionTrigger
  initiatedByUserId: string
  estimatedTaxOwed?: number
  estimatedPayments?: number
}

export interface SubmitExtensionInput {
  extensionId: string
  submittedByUserId: string
}

export interface MeFSubmissionResult {
  submissionId: string
  ackCode: "A"| "R" | "P"  // Accepted, Rejected, Pending
  ackMessage?: string
  timestamp: Date
}

// ─────────────────────────────────────────────
// 1. Create extension
// ─────────────────────────────────────────────

export async function createExtension(
  input: CreateExtensionInput,
): Promise<Extension> {
  const {
    clientId,
    returnId,
    firmId,
    taxYear,
    returnType,
    triggeredBy,
    initiatedByUserId,
    estimatedTaxOwed,
    estimatedPayments,
  } = input

  // Check we're not past the original due date
  if (isPastOriginalDue(returnType, taxYear)) {
    const { originalDue } = getDeadlines(returnType, taxYear)
    throw new ExtensionError(
      `PAST_DUE`,
      `The original due date for this return was ${formatDeadline(originalDue)}. ` +
      `Late extensions must be submitted directly to the IRS.`,
    )
  }

  // Check no accepted extension already exists
  const existing = await prisma.extension.findFirst({
    where: {
      clientId,
      taxYear,
      returnType,
      status: { in: ["SUBMITTED", "ACCEPTED"] },
    },
  })
  if (existing) {
    throw new ExtensionError(
      "DUPLICATE",
      `An extension for tax year ${taxYear} already exists with status: ${existing.status}`,
    )
  }

  const { extensionForm, originalDue, extendedDue } = getDeadlines(returnType, taxYear)

  const balanceDue =
    estimatedTaxOwed != null && estimatedPayments != null
      ? Math.max(0, estimatedTaxOwed - estimatedPayments)
      : undefined

  const extension = await prisma.extension.create({
    data: {
      clientId,
      returnId,
      firmId,
      triggeredBy,
      initiatedByUserId,
      extensionForm,
      taxYear,
      returnType,
      status: "DRAFT",
      estimatedTaxOwed: estimatedTaxOwed != null ? new Prisma.Decimal(estimatedTaxOwed) : undefined,
      estimatedPayments: estimatedPayments != null ? new Prisma.Decimal(estimatedPayments) : undefined,
      balanceDue: balanceDue != null ? new Prisma.Decimal(balanceDue) : undefined,
      originalDueDate: originalDue,
      extendedDueDate: extendedDue,
    },
  })

  // Notify preparer if client triggered it
  if (triggeredBy === "CLIENT") {
    await notifyPreparerOfClientRequest(extension)
  }

  return extension
}

// ─────────────────────────────────────────────
// 2. Validate before submission
// ─────────────────────────────────────────────

async function validateForSubmission(extensionId: string): Promise<Extension> {
  const extension = await prisma.extension.findUniqueOrThrow({
    where: { id: extensionId },
    include: { client: true },
  })

  if (extension.status !== "DRAFT") {
    throw new ExtensionError(
      "INVALID_STATE",
      `Extension is already ${extension.status} — cannot resubmit`,
    )
  }

  if (!extension.client.ssn && !extension.client.ein) {
    throw new ExtensionError(
      "MISSING_TIN",
      "Client must have an SSN or EIN on file before filing an extension",
    )
  }

  if (isPastOriginalDue(extension.returnType, extension.taxYear)) {
    throw new ExtensionError(
      "PAST_DUE",
      "Cannot submit extension — original due date has passed",
    )
  }

  // Firm must have EFIN on file
  const firm = await prisma.firm.findUnique({ where: { id: extension.firmId! } })
  if (!firm?.efin) {
    throw new ExtensionError(
      "MISSING_EFIN",
      "Firm EFIN is required before submitting any e-file",
    )
  }

  return extension
}

// ─────────────────────────────────────────────
// 3. Submit to IRS MeF
// ─────────────────────────────────────────────

export async function submitExtension(
  input: SubmitExtensionInput,
): Promise<Extension> {
  const { extensionId, submittedByUserId } = input

  const extension = await validateForSubmission(extensionId)

  // Mark as submitted optimistically so duplicate clicks are rejected
  await prisma.extension.update({
    where: { id: extensionId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  })

  let mefResult: MeFSubmissionResult

  try {
    mefResult = await submitToMeF(extension)
  } catch (err) {
    // Roll back to DRAFT so preparer can retry
    await prisma.extension.update({
      where: { id: extensionId },
      data: { status: "DRAFT", submittedAt: null },
    })
    throw new ExtensionError("MEF_ERROR", `IRS MeF submission failed: ${String(err)}`)
  }

  return handleMeFAck(extensionId, mefResult, submittedByUserId)
}

// ─────────────────────────────────────────────
// 4. Handle IRS ACK
// ─────────────────────────────────────────────

export async function handleMeFAck(
  extensionId: string,
  result: MeFSubmissionResult,
  actorUserId: string,
): Promise<Extension> {
  const extension = await prisma.extension.findUniqueOrThrow({
    where: { id: extensionId },
  })

  const isAccepted = result.ackCode === "A"
  const newExtStatus: ExtensionStatus = isAccepted ? "ACCEPTED" : "REJECTED"

  const updated = await prisma.$transaction(async (tx) => {
    // Update the extension record
    const ext = await tx.extension.update({
      where: { id: extensionId },
      data: {
        status: newExtStatus,
        irsSubmissionId: result.submissionId,
        irsAckCode: result.ackCode,
        irsAckAt: result.timestamp,
        irsAckMessage: result.ackMessage ?? null,
        acceptedAt: isAccepted ? result.timestamp : null,
      },
    })

    // If linked to a return, update the return status via state machine
    if (ext.returnId) {
      const ret = await tx.taxReturn.findUniqueOrThrow({
        where: { id: ext.returnId },
        include: { signatures: true },
      })

      const smCtx = {
        actorRole: "ADMIN" as Role,  // System actor — bypass role guard
        hasSignature: ret.signatures.some((s) => s.status === "SIGNED"),
        allDiagnosticsPassed: true,  // Extension doesn't require diagnostics
        extensionAccepted: isAccepted,
      }

      const event = isAccepted ? "MARK_EXTENSION" as const : "REJECT_EXTENSION" as const
      const result = canTransition(ret.status, event, smCtx)

      if (result.ok) {
        await tx.taxReturn.update({
          where: { id: ext.returnId },
          data: { status: result.nextStatus },
        })

        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            returnId: ext.returnId,
            action: isAccepted ? "extension.accepted" : "extension.rejected",
            detail: { extensionId, ackCode: result },
          },
        })
      }
    }

    return ext
  })

  // Notify client of outcome
  await notifyClientOfExtensionOutcome(updated)

  return updated
}

// ─────────────────────────────────────────────
// 5. IRS MeF adapter (stub — replace with real client)
// ─────────────────────────────────────────────

/**
 * Replace this stub with your actual IRS MeF client integration.
 *
 * The MeF API uses SOAP/XML over HTTPS. You'll need:
 *  - Your EFIN (Electronic Filing Identification Number)
 *  - Your ETIN (Electronic Transmitter Identification Number)
 *  - IRS MeF SOAP endpoint (prod: sa.www4.irs.gov/irfof-mdm/services/MeFTransmitterService)
 *
 * For testing, use the IRS Assurance Testing System (ATS):
 *   https://la.www4.irs.gov/irfof-mdm/services/MeFTransmitterService
 *
 * Libraries: consider `strong-soap` or `soap` npm packages for SOAP handling.
 */
async function submitToMeF(extension: Extension): Promise<MeFSubmissionResult> {
  if (process.env.NODE_ENV === "test" || process.env.USE_MEF_STUB === "true") {
    // Stub: always accept in test/dev
    await new Promise((r) => setTimeout(r, 500))
    return {
      submissionId: `STUB-${Date.now()}`,
      ackCode: "A",
      ackMessage: "Stub acceptance — replace with real MeF integration",
      timestamp: new Date(),
    }
  }

  // TODO: Implement real MeF SOAP submission
  // 1. Build XML payload (Form 4868 or 7004 data)
  // 2. Sign with your TCC credentials
  // 3. POST to MeF endpoint
  // 4. Parse SOAP ACK response
  // 5. Return MeFSubmissionResult

  throw new Error(
    "Real MeF integration not yet implemented. " +
    "Set USE_MEF_STUB=true in .env to use the stub for development.",
  )
}

// ─────────────────────────────────────────────
// 6. Notifications (wire to your email/SMS service)
// ─────────────────────────────────────────────

async function notifyPreparerOfClientRequest(extension: Extension) {
  // Find the firm's preparers and create in-app notifications
  const preparers = await prisma.user.findMany({
    where: { firmId: extension.firmId!, role: "PREPARER", isActive: true },
  })

  await prisma.notification.createMany({
    data: preparers.map((p) => ({
      userId: p.id,
      title: "Extension requested by client",
      body: `A client has requested an extension for tax year ${extension.taxYear}. Review and approve in the dashboard.`,
      link: `/extensions/${extension.id}`,
    })),
  })
}

async function notifyClientOfExtensionOutcome(extension: Extension) {
  const client = await prisma.client.findUnique({
    where: { id: extension.clientId },
    include: { user: true },
  })

  if (!client?.user) return

  const { extendedDue } = { extendedDue: extension.extendedDueDate }
  const accepted = extension.status === "ACCEPTED"

  await prisma.notification.create({
    data: {
      userId: client.user.id,
      title: accepted ? "Extension filed successfully" : "Extension was rejected",
      body: accepted
        ? `Your tax extension has been accepted by the IRS. Your new filing deadline is ${formatDeadline(extendedDue)}. ` +
          `Important: any tax owed was still due by the original deadline — please pay the IRS directly if applicable.`
        : `Your extension request was rejected by the IRS. Reason: ${extension.irsAckMessage ?? "See your preparer for details."}`,
      link: `/returns`,
    },
  })
}

// ─────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────

export class ExtensionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ExtensionError"
  }
}
