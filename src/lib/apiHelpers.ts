/**
 * TaxApp — API Helpers
 *
 * Consistent JSON response shape across all routes.
 * Every route returns { data } on success or { error: { code, message, detail } } on failure.
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ReturnServiceError } from "@/services/returnService"
import { ExtensionError } from "@/services/extensionService"

// ─────────────────────────────────────────────
// Success
// ─────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

// ─────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────

export function apiError(
  code: string,
  message: string,
  status: number,
  detail?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(detail ? { detail } : {}) } },
    { status },
  )
}

export function badRequest(message: string, detail?: unknown) {
  return apiError("BAD_REQUEST", message, 400, detail)
}

export function unauthorized(message = "Authentication required") {
  return apiError("UNAUTHORIZED", message, 401)
}

export function forbidden(message = "You do not have permission to perform this action") {
  return apiError("FORBIDDEN", message, 403)
}

export function notFound(resource = "Resource") {
  return apiError("NOT_FOUND", `${resource} not found`, 404)
}

export function conflict(message: string) {
  return apiError("CONFLICT", message, 409)
}

export function serverError(message = "An unexpected error occurred") {
  return apiError("SERVER_ERROR", message, 500)
}

// ─────────────────────────────────────────────
// Domain error → HTTP response mapper
// ─────────────────────────────────────────────

const EXTENSION_ERROR_MAP: Record<string, number> = {
  PAST_DUE:        422,
  DUPLICATE:       409,
  INVALID_STATE:   409,
  MISSING_TIN:     422,
  MISSING_EFIN:    422,
  MEF_ERROR:       502,
}

const RETURN_ERROR_MAP: Record<string, number> = {
  TRANSITION_BLOCKED: 409,
  UNAUTHORIZED:       403,
  INVALID_STATE:      409,
  MEF_ERROR:          502,
}

export function handleError(err: unknown): NextResponse {
  // Zod validation errors
  if (err instanceof ZodError) {
    return badRequest("Validation failed", err.flatten().fieldErrors)
  }

  // Domain errors
  if (err instanceof ExtensionError) {
    const status = EXTENSION_ERROR_MAP[err.code] ?? 400
    return apiError(err.code, err.message, status)
  }

  if (err instanceof ReturnServiceError) {
    const status = RETURN_ERROR_MAP[err.code] ?? 400
    return apiError(err.code, err.message, status)
  }

  // Prisma not found
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2025"
  ) {
    return notFound()
  }

  // Unknown
  console.error("[API Error]", err)
  return serverError()
}
