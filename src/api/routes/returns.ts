/**
 * TaxApp — Returns API
 *
 * POST   /api/returns                        → create return
 * GET    /api/returns                        → list returns
 * GET    /api/returns/[id]                   → get single return
 * PATCH  /api/returns/[id]                   → update draft fields
 * POST   /api/returns/[id]/transition        → apply state transition
 * GET    /api/returns/[id]/diagnostics       → run diagnostics
 * POST   /api/returns/[id]/submit            → submit to IRS MeF
 * POST   /api/returns/[id]/amend             → create amended return
 * POST   /api/returns/ack                    → IRS MeF ACK webhook
 */

import { z } from "zod"
import { NextRequest } from "next/server"
import { prisma } from "@/src/lib/prisma"
import {
  applyTransition,
  runDiagnostics,
  submitReturnToIRS,
  correctRejectedReturn,
  createAmendedReturn,
  ReturnServiceError,
} from "@/src/services/returnService"
import { requireSession, canAccessClient } from "@/src/lib/routeAuth"
import {
  ok,
  created,
  badRequest,
  forbidden,
  notFound,
  handleError,
} from "@/src/lib/apiHelpers"
import { ReturnType, ReturnStatus } from "@prisma/client"
import { TransitionEvent } from "@/src/lib/returnStateMachine"

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const CreateReturnSchema = z.object({
  clientId:   z.string().cuid(),
  taxYear:    z.number().int().min(2020).max(2099),
  returnType: z.nativeEnum(ReturnType),
  stateCode:  z.string().length(2).optional(),
})

const UpdateReturnSchema = z.object({
  stateCode:      z.string().length(2).optional(),
  preparerId:     z.string().cuid().optional(),
  reviewerId:     z.string().cuid().optional(),
  readyForReview: z.boolean().optional(),
  readyForClient: z.boolean().optional(),
}).strict()

const TransitionSchema = z.object({
  event: z.enum([
    "SAVE",
    "SUBMIT_FOR_REVIEW",
    "REQUEST_SIGNATURE",
    "SIGN",
    "SUBMIT",
    "IRS_ACCEPT",
    "IRS_REJECT",
    "CORRECT",
    "AMEND",
    "MARK_EXTENSION",
    "REJECT_EXTENSION",
    "UNLOCK",
  ] as const),
})

const MeFAckSchema = z.object({
  returnId:      z.string().cuid(),
  submissionId:  z.string(),
  ackCode:       z.enum(["A", "R"]),
  ackMessage:    z.string().optional(),
  timestamp:     z.string().datetime(),
  webhookSecret: z.string(),
})

const ListReturnsSchema = z.object({
  clientId:   z.string().cuid().optional(),
  status:     z.nativeEnum(ReturnStatus).optional(),
  returnType: z.nativeEnum(ReturnType).optional(),
  taxYear:    z.coerce.number().int().optional(),
  preparerId: z.string().cuid().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(25),
})

// ─────────────────────────────────────────────
// POST /api/returns
// ─────────────────────────────────────────────

export async function POST_create(req: NextRequest) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    const body = CreateReturnSchema.parse(await req.json())

    const allowed = await canAccessClient(auth.user, body.clientId)
    if (!allowed) return forbidden()

    // Prevent duplicate open return for same client/year/type
    const existing = await prisma.taxReturn.findFirst({
      where: {
        clientId:   body.clientId,
        taxYear:    body.taxYear,
        returnType: body.returnType,
        isAmended:  false,
        status:     { notIn: ["ACCEPTED", "AMENDED"] },
      },
    })
    if (existing) {
      return badRequest(
        `An open ${body.returnType} return for tax year ${body.taxYear} already exists`,
      )
    }

    const taxReturn = await prisma.taxReturn.create({
      data: {
        firmId:     auth.user.firmId!,
        clientId:   body.clientId,
        preparerId: auth.user.id,
        taxYear:    body.taxYear,
        returnType: body.returnType,
        stateCode:  body.stateCode,
        status:     "DRAFT",
      },
    })

    // Create the appropriate form data record
    if (body.returnType === "F1040") {
      await prisma.f1040Data.create({ data: { returnId: taxReturn.id } })
    } else if (body.returnType === "F1120S") {
      await prisma.f1120SData.create({ data: { returnId: taxReturn.id } })
    } else if (body.returnType === "F1065") {
      await prisma.f1065Data.create({ data: { returnId: taxReturn.id } })
    }

    await prisma.auditLog.create({
      data: {
        userId:   auth.user.id,
        returnId: taxReturn.id,
        action:   "return.created",
        detail:   { returnType: body.returnType, taxYear: body.taxYear },
      },
    })

    return created(taxReturn)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// GET /api/returns
// ─────────────────────────────────────────────

export async function GET_list(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(req.url)
    const query = ListReturnsSchema.parse(Object.fromEntries(searchParams))

    const { page, limit, ...filters } = query
    const skip = (page - 1) * limit

    // Filers see only their own returns
    let clientId = filters.clientId
    if (auth.user.role === "FILER") {
      const client = await prisma.client.findFirst({
        where: { userId: auth.user.id },
      })
      clientId = client?.id
    }

    const where = {
      ...(auth.user.firmId && auth.user.role !== "FILER"
        ? { firmId: auth.user.firmId }
        : {}),
      ...(clientId ? { clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.returnType ? { returnType: filters.returnType } : {}),
      ...(filters.taxYear ? { taxYear: filters.taxYear } : {}),
      ...(filters.preparerId ? { preparerId: filters.preparerId } : {}),
    }

    const [returns, total] = await prisma.$transaction([
      prisma.taxReturn.findMany({
        where,
        include: {
          client: {
            select: { firstName: true, lastName: true, businessName: true },
          },
          preparer: { select: { name: true } },
          extensions: {
            select: { status: true, extendedDueDate: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.taxReturn.count({ where }),
    ])

    return ok({
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// GET /api/returns/[id]
// ─────────────────────────────────────────────

export async function GET_single(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession()
    if (!auth.ok) return auth.response

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
      include: {
        client:      true,
        preparer:    { select: { id: true, name: true, email: true } },
        reviewer:    { select: { id: true, name: true, email: true } },
        f1040:       true,
        f1120s:      { include: { shareholders: true, k1s: true } },
        f1065:       { include: { partners: true, k1s: true } },
        schedules:   true,
        incomeItems: true,
        documents:   { where: { isArchived: false } },
        signatures:  true,
        extensions:  { orderBy: { createdAt: "desc" } },
        stateReturns: true,
      },
    })

    if (!taxReturn) return notFound("Return")

    const allowed = await canAccessClient(auth.user, taxReturn.clientId)
    if (!allowed) return forbidden()

    return ok(taxReturn)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// PATCH /api/returns/[id]
// ─────────────────────────────────────────────

export async function PATCH_update(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
    })
    if (!taxReturn) return notFound("Return")

    if (taxReturn.lockedAt) {
      return badRequest("This return is locked and cannot be edited. Use the corrections workflow for rejected returns.")
    }

    const allowed = await canAccessClient(auth.user, taxReturn.clientId)
    if (!allowed) return forbidden()

    const body = UpdateReturnSchema.parse(await req.json())

    const updated = await prisma.taxReturn.update({
      where: { id: params.id },
      data: body,
    })

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/returns/[id]/transition
// ─────────────────────────────────────────────

export async function POST_transition(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession()
    if (!auth.ok) return auth.response

    const { event } = TransitionSchema.parse(await req.json())

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
    })
    if (!taxReturn) return notFound("Return")

    const allowed = await canAccessClient(auth.user, taxReturn.clientId)
    if (!allowed) return forbidden()

    const updated = await applyTransition(
      params.id,
      event as TransitionEvent,
      { userId: auth.user.id, role: auth.user.role },
    )

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// GET /api/returns/[id]/diagnostics
// ─────────────────────────────────────────────

export async function GET_diagnostics(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
    })
    if (!taxReturn) return notFound("Return")

    const allowed = await canAccessClient(auth.user, taxReturn.clientId)
    if (!allowed) return forbidden()

    const diagnostics = await runDiagnostics(params.id, taxReturn.returnType)

    return ok(diagnostics)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/returns/[id]/submit
// ─────────────────────────────────────────────

export async function POST_submit(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
    })
    if (!taxReturn) return notFound("Return")

    if (taxReturn.firmId !== auth.user.firmId) return forbidden()

    const updated = await submitReturnToIRS(params.id, {
      userId: auth.user.id,
      role: auth.user.role,
    })

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/returns/[id]/amend
// ─────────────────────────────────────────────

export async function POST_amend(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: params.id },
    })
    if (!taxReturn) return notFound("Return")
    if (taxReturn.firmId !== auth.user.firmId) return forbidden()

    const amended = await createAmendedReturn(params.id, {
      userId: auth.user.id,
      role: auth.user.role,
    })

    return created(amended)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/returns/ack  (IRS MeF webhook)
// ─────────────────────────────────────────────

export async function POST_ack(req: NextRequest) {
  try {
    const body = MeFAckSchema.parse(await req.json())

    if (body.webhookSecret !== process.env.WEBHOOK_SECRET) {
      return forbidden("Invalid webhook secret")
    }

    const event = body.ackCode === "A" ? "IRS_ACCEPT" : "IRS_REJECT"

    const updated = await applyTransition(
      body.returnId,
      event as TransitionEvent,
      { userId: "system", role: "ADMIN" },
      {
        irsAckCode:     body.ackCode,
        irsAckMessage:  body.ackMessage,
        irsSubmissionId: body.submissionId,
      },
    )

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}
