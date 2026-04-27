import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const item = await prisma.incomeItem.create({
    data: {
      returnId: params.id,
      type: "W2",
      payerName: body.employer?.name ?? null,
      payerEin: body.employer?.ein ?? null,
      amount: new Prisma.Decimal(body.boxes?.box1 || 0),
      federalWithheld: body.boxes?.box2 != null ? new Prisma.Decimal(body.boxes?.box2 || 0) : null,
      stateWithheld: body.stateLocal?.[0]?.stateIncomeTax != null ? new Prisma.Decimal(body.stateLocal[0].stateIncomeTax) : null,
      stateCode: body.stateLocal?.[0]?.state ?? null,
      boxData: body,
    },
  })
  return NextResponse.json({ data: item }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const items = await prisma.incomeItem.findMany({
    where: { returnId: params.id, type: "W2" },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ data: items })
}
