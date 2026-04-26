import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const taxReturn = await prisma.taxReturn.findUnique({ where: { id: params.id } })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.client.update({
    where: { id: taxReturn.clientId },
    data: {
      firstName: body.firstName || undefined,
      lastName: body.lastName || undefined,
      ssn: body.ssn || undefined,
      dob: body.dob ? new Date(body.dob) : undefined,
      phone: body.daytimePhone || undefined,
      email: body.email || undefined,
      address: body.address || undefined,
      city: body.city || undefined,
      state: body.state || undefined,
      zip: body.zip || undefined,
    },
  })
  if (body.filingStatus || body.spouseFirstName || body.spouseSSN) {
    await prisma.f1040Data.upsert({
      where: { returnId: params.id },
      create: {
        returnId: params.id,
        filingStatus: body.filingStatus || undefined,
        spouseFirstName: body.spouseFirstName || undefined,
        spouseLastName: body.spouseLastName || undefined,
        spouseSsn: body.spouseSSN || undefined,
        spouseDob: body.spouseDOB ? new Date(body.spouseDOB) : undefined,
      },
      update: {
        filingStatus: body.filingStatus || undefined,
        spouseFirstName: body.spouseFirstName || undefined,
        spouseLastName: body.spouseLastName || undefined,
        spouseSsn: body.spouseSSN || undefined,
        spouseDob: body.spouseDOB ? new Date(body.spouseDOB) : undefined,
      },
    })
  }
  await prisma.schedule.upsert({
    where: { returnId_scheduleType: { returnId: params.id, scheduleType: "PERSONAL_INFO" } },
    create: { returnId: params.id, scheduleType: "PERSONAL_INFO", data: body },
    update: { data: body },
  })
  return NextResponse.json({ data: { ok: true } })
}
