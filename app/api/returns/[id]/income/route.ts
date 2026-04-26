import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })

  const body = await req.json()

  const item = await prisma.incomeItem.create({
    data: {
      returnId:        params.id,
      type:            body.type ?? "W2",
      payerName:       body.payerName ?? null,
      amount:          new Prisma.Decimal(body.amount),
      federalWithheld: body.federalWithheld != null ? new Prisma.Decimal(body.federalWithheld) : null,
      stateWithheld:   body.stateWithheld != null ? new Prisma.Decimal(body.stateWithheld) : null,
    },
  })

  return NextResponse.json({ data: item }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })

  const items = await prisma.incomeItem.findMany({
    where: { returnId: params.id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: items })
}
