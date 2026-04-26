/**
 * TaxApp — Deadline Utilities
 *
 * Computes original and extended due dates for each return type.
 * Source of truth for the Extension model's originalDueDate / extendedDueDate.
 *
 * IRS rules (as of 2025):
 *  - 1040  individual:  Apr 15  → Oct 15  (Form 4868, 6 months)
 *  - 1120-S S-Corp:    Mar 15  → Sep 15  (Form 7004, 6 months)
 *  - 1065  Partnership: Mar 15 → Sep 15  (Form 7004, 6 months)
 *
 * When Apr 15 / Mar 15 falls on a weekend or federal holiday, the IRS
 * shifts the deadline to the next business day. This module handles that
 * via the `nextBusinessDay` helper.
 */

import { ReturnType, ExtensionForm } from "@prisma/client"

// Federal holidays that affect tax deadlines (static list for near-term years)
// Extend this table as needed or fetch from an API
const FEDERAL_HOLIDAYS: Record<number, string[]> = {
  2025: ["2025-01-01","2025-01-20","2025-02-17","2025-05-26","2025-06-19","2025-07-04","2025-09-01","2025-10-13","2025-11-11","2025-11-27","2025-12-25"],
  2026: ["2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19","2026-07-04","2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25"],
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

function isHoliday(d: Date, year: number): boolean {
  const holidays = FEDERAL_HOLIDAYS[year] ?? []
  const iso = d.toISOString().slice(0, 10)
  return holidays.includes(iso)
}

function nextBusinessDay(d: Date): Date {
  const result = new Date(d)
  while (isWeekend(result) || isHoliday(result, result.getUTCFullYear())) {
    result.setUTCDate(result.getUTCDate() + 1)
  }
  return result
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

// ─────────────────────────────────────────────
// Core deadline logic
// ─────────────────────────────────────────────

export interface DeadlineInfo {
  extensionForm: ExtensionForm
  originalDue: Date
  extendedDue: Date
}

/**
 * Returns the original and extended due dates for a given return type
 * and tax year (the year the income was earned, e.g. 2025 for a return
 * filed in 2026).
 */
export function getDeadlines(returnType: ReturnType, taxYear: number): DeadlineInfo {
  // Filing year is taxYear + 1
  const filingYear = taxYear + 1

  switch (returnType) {
    case "F1040": {
      const raw = utcDate(filingYear, 4, 15)       // Apr 15
      const originalDue = nextBusinessDay(raw)
      const extRaw = utcDate(filingYear, 10, 15)   // Oct 15
      const extendedDue = nextBusinessDay(extRaw)
      return { extensionForm: "F4868", originalDue, extendedDue }
    }

    case "F1120S":
    case "F1065": {
      const raw = utcDate(filingYear, 3, 15)       // Mar 15
      const originalDue = nextBusinessDay(raw)
      const extRaw = utcDate(filingYear, 9, 15)    // Sep 15
      const extendedDue = nextBusinessDay(extRaw)
      return { extensionForm: "F7004", originalDue, extendedDue }
    }

    default:
      throw new Error(`Unsupported return type: ${returnType}`)
  }
}

/**
 * Returns true if today is past the original due date for this return,
 * meaning a late-filed extension may be invalid.
 */
export function isPastOriginalDue(returnType: ReturnType, taxYear: number): boolean {
  const { originalDue } = getDeadlines(returnType, taxYear)
  return new Date() > originalDue
}

/**
 * Returns true if an extension is still in time (today ≤ extendedDue)
 */
export function isWithinExtensionPeriod(returnType: ReturnType, taxYear: number): boolean {
  const { extendedDue } = getDeadlines(returnType, taxYear)
  return new Date() <= extendedDue
}

/**
 * Friendly display string for the due date, e.g. "April 15, 2026"
 */
export function formatDeadline(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}
