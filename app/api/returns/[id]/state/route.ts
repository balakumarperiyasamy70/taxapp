import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  await prisma.stateReturn.upsert({
    where: { id: params.id + "_AR" },
    create: {
      returnId: params.id,
      stateCode: "AR",
      status: "DRAFT",
      data: body,
      refundAmount: body.arRefundOrOwed > 0 ? body.arRefundOrOwed : null,
      amountOwed: body.arRefundOrOwed < 0 ? Math.abs(body.arRefundOrOwed) : null,
    },
    update: {
      data: body,
      refundAmount: body.arRefundOrOwed > 0 ? body.arRefundOrOwed : null,
      amountOwed: body.arRefundOrOwed < 0 ? Math.abs(body.arRefundOrOwed) : null,
    },
  })
  return NextResponse.json({ data: { ok: true } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const stateReturn = await prisma.stateReturn.findFirst({
    where: { returnId: params.id, stateCode: "AR" },
  })
  return NextResponse.json({ data: stateReturn?.data ?? {} })
}
