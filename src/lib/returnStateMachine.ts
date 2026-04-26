/**
 * TaxApp — Return Status Machine
 *
 * Defines every valid ReturnStatus transition and the guard conditions
 * that must be satisfied before the transition is allowed.
 *
 * Usage:
 *   import { canTransition, transition } from "@/lib/returnStateMachine"
 *
 *   const result = transition(return, "SUBMIT", context)
 *   if (!result.ok) throw new Error(result.reason)
 */

import { ReturnStatus, ReturnType, Role } from "@prisma/client"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TransitionEvent =
  | "SAVE"               // Auto-save draft edits
  | "SUBMIT_FOR_REVIEW"  // Preparer marks ready for internal review
  | "REQUEST_SIGNATURE"  // Preparer sends 8879 to client
  | "SIGN"               // Client signs Form 8879
  | "SUBMIT"             // Preparer submits to IRS MeF
  | "IRS_ACCEPT"         // IRS ACK: accepted
  | "IRS_REJECT"         // IRS ACK: rejected
  | "CORRECT"            // Preparer corrects rejected return
  | "AMEND"              // Preparer starts 1040-X / amended return
  | "MARK_EXTENSION"     // Extension accepted — flag on return
  | "REJECT_EXTENSION"   // Extension rejected — flag on return
  | "UNLOCK"             // Admin unlocks a submitted return

export interface TransitionContext {
  actorRole: Role
  hasSignature: boolean       // At least one accepted signature exists
  allDiagnosticsPassed: boolean
  extensionAccepted?: boolean
  irsAckCode?: string
}

type TransitionResult = {
  ok: true
  nextStatus: ReturnStatus
} | {
  ok: false
  reason: string
}

// ─────────────────────────────────────────────
// State transition map
// Each key: [currentStatus, event] → { next, guard }
// ─────────────────────────────────────────────

type TransitionKey = `${ReturnStatus}:${TransitionEvent}`

interface TransitionDef {
  next: ReturnStatus
  guard: (ctx: TransitionContext) => string | null  // null = allowed; string = reason blocked
}

const TRANSITIONS: Record<TransitionKey, TransitionDef> = {

  // ── DRAFT ──────────────────────────────────

  "DRAFT:SAVE": {
    next: "DRAFT",
    guard: () => null,
  },

  "DRAFT:SUBMIT_FOR_REVIEW": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot submit for review"
      if (!ctx.allDiagnosticsPassed) return "All diagnostics must pass before review"
      return null
    },
  },

  "DRAFT:MARK_EXTENSION": {
    next: "EXTENSION_FILED",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot mark extension status"
      if (!ctx.extensionAccepted) return "Extension must be IRS-accepted first"
      return null
    },
  },

  // ── IN_REVIEW ──────────────────────────────

  "IN_REVIEW:SAVE": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot edit a return under review"
      return null
    },
  },

  "IN_REVIEW:SUBMIT_FOR_REVIEW": {
    next: "IN_REVIEW",
    guard: () => null, // Re-assign reviewer
  },

  "IN_REVIEW:REQUEST_SIGNATURE": {
    next: "PENDING_SIGNATURE",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot request signatures"
      if (!ctx.allDiagnosticsPassed) return "All diagnostics must pass before requesting signature"
      return null
    },
  },

  "IN_REVIEW:UNLOCK": {
    next: "DRAFT",
    guard: (ctx) => {
      if (ctx.actorRole !== "ADMIN") return "Only admins can unlock a return in review"
      return null
    },
  },

  // ── PENDING_SIGNATURE ──────────────────────

  "PENDING_SIGNATURE:SIGN": {
    next: "SIGNED",
    guard: () => null, // Signature webhook handles this
  },

  "PENDING_SIGNATURE:UNLOCK": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot unlock a return"
      return null
    },
  },

  // ── SIGNED ─────────────────────────────────

  "SIGNED:SUBMIT": {
    next: "SUBMITTED",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot submit returns to the IRS"
      if (!ctx.hasSignature) return "Signed Form 8879 is required before submission"
      if (!ctx.allDiagnosticsPassed) return "All diagnostics must pass before submission"
      return null
    },
  },

  "SIGNED:UNLOCK": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot unlock a return"
      return null
    },
  },

  // ── SUBMITTED ──────────────────────────────

  "SUBMITTED:IRS_ACCEPT": {
    next: "ACCEPTED",
    guard: () => null, // IRS webhook only
  },

  "SUBMITTED:IRS_REJECT": {
    next: "REJECTED",
    guard: () => null, // IRS webhook only
  },

  // ── ACCEPTED ───────────────────────────────

  "ACCEPTED:AMEND": {
    next: "AMENDED",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot initiate amendments"
      return null
    },
  },

  // ── REJECTED ───────────────────────────────

  "REJECTED:CORRECT": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot correct rejected returns"
      return null
    },
  },

  // ── EXTENSION_FILED ────────────────────────

  "EXTENSION_FILED:SUBMIT_FOR_REVIEW": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot submit for review"
      if (!ctx.allDiagnosticsPassed) return "All diagnostics must pass before review"
      return null
    },
  },

  "EXTENSION_FILED:REJECT_EXTENSION": {
    next: "EXTENSION_REJECTED",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot update extension status"
      return null
    },
  },

  // ── EXTENSION_REJECTED ─────────────────────

  "EXTENSION_REJECTED:MARK_EXTENSION": {
    next: "EXTENSION_FILED",
    guard: (ctx) => {
      if (!ctx.extensionAccepted) return "Extension must be IRS-accepted first"
      return null
    },
  },

  "EXTENSION_REJECTED:CORRECT": {
    next: "DRAFT",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot correct extensions"
      return null
    },
  },

  // ── AMENDED ────────────────────────────────

  "AMENDED:SUBMIT_FOR_REVIEW": {
    next: "IN_REVIEW",
    guard: (ctx) => {
      if (ctx.actorRole === "FILER") return "Filers cannot submit for review"
      if (!ctx.allDiagnosticsPassed) return "All diagnostics must pass"
      return null
    },
  },
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export function canTransition(
  currentStatus: ReturnStatus,
  event: TransitionEvent,
  ctx: TransitionContext,
): TransitionResult {
  const key = `${currentStatus}:${event}` as TransitionKey
  const def = TRANSITIONS[key]

  if (!def) {
    return {
      ok: false,
      reason: `No transition defined for ${currentStatus} → ${event}`,
    }
  }

  const blockReason = def.guard(ctx)
  if (blockReason) {
    return { ok: false, reason: blockReason }
  }

  return { ok: true, nextStatus: def.next }
}

/**
 * Returns all events that are currently available from a given status,
 * filtered by what the actor's role is allowed to trigger.
 */
export function availableEvents(
  currentStatus: ReturnStatus,
  ctx: TransitionContext,
): TransitionEvent[] {
  const available: TransitionEvent[] = []

  for (const key of Object.keys(TRANSITIONS) as TransitionKey[]) {
    const [status, event] = key.split(":") as [ReturnStatus, TransitionEvent]
    if (status !== currentStatus) continue
    const result = canTransition(currentStatus, event, ctx)
    if (result.ok) available.push(event)
  }

  return available
}

/**
 * Human-readable labels for status badges in the UI
 */
export const STATUS_LABELS: Record<ReturnStatus, string> = {
  DRAFT:              "Draft",
  IN_REVIEW:          "In review",
  PENDING_SIGNATURE:  "Awaiting signature",
  SIGNED:             "Signed",
  SUBMITTED:          "Submitted",
  ACCEPTED:           "Accepted",
  REJECTED:           "Rejected",
  AMENDED:            "Amended",
  EXTENSION_FILED:    "Extension filed",
  EXTENSION_REJECTED: "Extension rejected",
}

/**
 * CSS color class per status — maps to your design system
 */
export const STATUS_COLOR: Record<ReturnStatus, "gray" | "blue" | "amber" | "green" | "red" | "purple" | "teal"> = {
  DRAFT:              "gray",
  IN_REVIEW:          "blue",
  PENDING_SIGNATURE:  "amber",
  SIGNED:             "teal",
  SUBMITTED:          "purple",
  ACCEPTED:           "green",
  REJECTED:           "red",
  AMENDED:            "amber",
  EXTENSION_FILED:    "teal",
  EXTENSION_REJECTED: "red",
}
