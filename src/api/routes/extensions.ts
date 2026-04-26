/**
 * TaxApp — Extensions API
 *
 * POST   /api/extensions          → create extension
 * GET    /api/extensions          → list extensions (preparer/admin)
 * GET    /api/extensions/[id]     → get single extension
 * POST   /api/extensions/[id]/submit   → submit to IRS MeF
 * POST   /api/extensions/ack      → IRS MeF ACK webhook (internal)
 */

import { z } from "zod"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  createExtension,
  submitExtension,
  handleMeFAck,
  ExtensionError,
} from "@/services/extensionService"
import { requireSession, canAccessClient } from "@/lib/routeAuth"
import {
  ok,
  created,
  badRequest,
  forbidden,
  notFound,
  handleError,
} from "@/lib/apiHelpers"
import { ReturnType, ExtensionTrigger } from "@prisma/client"

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const CreateExtensionSchema = z.object({
  clientId:          z.string().cuid(),
  returnId:          z.string().cuid().optional(),
  taxYear:           z.number().int().min(2020).max(2099),
  returnType:        z.nativeEnum(ReturnType),
  estimatedTaxOwed:  z.number().min(0).optional(),
  estimatedPayments: z.number().min(0).optional(),
})

const MeFAckSchema = z.object({
  extensionId:  z.string().cuid(),
  submissionId: z.string(),
  ackCode:      z.enum(["A", "R", "P"]),
  ackMessage:   z.string().optional(),
  timestamp:    z.string().datetime(),
  webhookSecret: z.string(),
})

// ─────────────────────────────────────────────
// POST /api/extensions
// ─────────────────────────────────────────────

export async function POST_create(req: NextRequest) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN", "FILER"])
    if (!auth.ok) return auth.response

    const body = CreateExtensionSchema.parse(await req.json())

    // Filers can only request extensions for themselves
    const allowed = await canAccessClient(auth.user, body.clientId)
    if (!allowed) return forbidden()

    // Determine trigger
    const triggeredBy: ExtensionTrigger =
      auth.user.role === "FILER" ? "CLIENT" : "PREPARER"

    const extension = await createExtension({
      ...body,
      firmId: auth.user.firmId!,
      triggeredBy,
      initiatedByUserId: auth.user.id,
    })

    return created(extension)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// GET /api/extensions
// ─────────────────────────────────────────────

export async function GET_list(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(req.url)
    const clientId  = searchParams.get("clientId") ?? undefined
    const taxYear   = searchParams.get("taxYear") ? Number(searchParams.get("taxYear")) : undefined
    const status    = searchParams.get("status") ?? undefined

    // Filers can only see their own extensions
    let clientFilter: string | undefined = clientId
    if (auth.user.role === "FILER") {
      const client = await prisma.client.findFirst({
        where: { userId: auth.user.id },
      })
      clientFilter = client?.id
    }

    const extensions = await prisma.extension.findMany({
      where: {
        ...(clientFilter ? { clientId: clientFilter } : {}),
        ...(auth.user.role !== "FILER" && auth.user.firmId
          ? { firmId: auth.user.firmId }
          : {}),
        ...(taxYear ? { taxYear } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        client: { select: { firstName: true, lastName: true, businessName: true } },
        initiatedBy: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return ok(extensions)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// GET /api/extensions/[id]
// ─────────────────────────────────────────────

export async function GET_single(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession()
    if (!auth.ok) return auth.response

    const extension = await prisma.extension.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        taxReturn: { select: { status: true, taxYear: true } },
        initiatedBy: { select: { name: true, role: true } },
      },
    })

    if (!extension) return notFound("Extension")

    const allowed = await canAccessClient(auth.user, extension.clientId)
    if (!allowed) return forbidden()

    return ok(extension)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/extensions/[id]/submit
// ─────────────────────────────────────────────

export async function POST_submit(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireSession(["PREPARER", "ADMIN"])
    if (!auth.ok) return auth.response

    // Verify the extension belongs to this firm
    const extension = await prisma.extension.findUnique({
      where: { id: params.id },
    })
    if (!extension) return notFound("Extension")
    if (extension.firmId !== auth.user.firmId) return forbidden()

    const updated = await submitExtension({
      extensionId: params.id,
      submittedByUserId: auth.user.id,
    })

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

// ─────────────────────────────────────────────
// POST /api/extensions/ack  (IRS MeF webhook)
// ─────────────────────────────────────────────

export async function POST_ack(req: NextRequest) {
  try {
    const body = MeFAckSchema.parse(await req.json())

    // Validate webhook secret — set WEBHOOK_SECRET in .env
    if (body.webhookSecret !== process.env.WEBHOOK_SECRET) {
      return forbidden("Invalid webhook secret")
    }

    const updated = await handleMeFAck(
      body.extensionId,
      {
        submissionId: body.submissionId,
        ackCode: body.ackCode,
        ackMessage: body.ackMessage,
        timestamp: new Date(body.timestamp),
      },
      "system", // system actor for webhook-initiated transitions
    )

    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}
