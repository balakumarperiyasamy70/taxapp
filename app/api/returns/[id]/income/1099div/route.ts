import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const amount = body.amount ?? body.totalAmount ?? body.netProfit ?? body.box1 ?? body.totalGain ?? body.grossIncome ?? 0
  const withheld = body.federalWithheld ?? body.box4 ?? body.taxWithheld ?? null
  const item = await prisma.incomeItem.create({
    data: {
      returnId: params.id,
      type: "F1099_DIV",
      payerName: body.payerName ?? body.employerName ?? body.businessName ?? null,
      payerEin: body.ein ?? body.payerEin ?? null,
      amount: new Prisma.Decimal(amount || 0),
      federalWithheld: withheld != null ? new Prisma.Decimal(withheld) : null,
      stateCode: body.stateCode ?? null,
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
