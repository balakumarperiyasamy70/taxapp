import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  await prisma.schedule.upsert({
    where: { returnId_scheduleType: { returnId: params.id, scheduleType: "IP_PIN" } },
    create: { returnId: params.id, scheduleType: "IP_PIN", data: body },
    update: { data: body },
  })
  return NextResponse.json({ data: { ok: true } })
}
