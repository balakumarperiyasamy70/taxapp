import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })

  const body = await req.json()

  const updated = await prisma.f1040Data.update({
    where: { returnId: params.id },
    data: {
      filingStatus:     body.filingStatus ?? undefined,
      spouseFirstName:  body.spouseFirstName ?? undefined,
      spouseLastName:   body.spouseLastName ?? undefined,
      spouseSsn:        body.spouseSsn ?? undefined,
    },
  })

  return NextResponse.json({ data: updated })
}
