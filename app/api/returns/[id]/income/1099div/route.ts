import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const amount = body.box1a ?? body.amount ?? 0
  const withheld = body.box4 ?? body.federalWithheld ?? null
  const item = await prisma.incomeItem.create({
    data: {
      returnId: params.id,
      type: "F1099_DIV",
      payerName: body.payerName ?? null,
      payerEin: body.ein ?? null,
      amount: new Prisma.Decimal(amount || 0),
      federalWithheld: withheld != null ? new Prisma.Decimal(withheld) : null,
      stateCode: body.state ?? null,
      boxData: body,
    },
  })
  return NextResponse.json({ data: item }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const items = await prisma.incomeItem.findMany({
    where: { returnId: params.id, type: "F1099_DIV" },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ data: items })
}
