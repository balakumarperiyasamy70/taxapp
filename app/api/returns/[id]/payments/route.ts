import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  await prisma.schedule.upsert({
    where: { returnId_scheduleType: { returnId: params.id, scheduleType: "PAYMENTS" } },
    create: { returnId: params.id, scheduleType: "PAYMENTS", data: body },
    update: { data: body },
  })
  return NextResponse.json({ data: { ok: true } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schedule = await prisma.schedule.findUnique({
    where: { returnId_scheduleType: { returnId: params.id, scheduleType: "PAYMENTS" } },
  })
  return NextResponse.json({ data: schedule?.data ?? {} })
}
