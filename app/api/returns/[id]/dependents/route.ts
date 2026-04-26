import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const taxReturn = await prisma.taxReturn.findUnique({ where: { id: params.id } })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const dependent = await prisma.dependent.create({
    data: {
      clientId: taxReturn.clientId,
      firstName: body.firstName,
      lastName: body.lastName,
      ssn: body.ssn || null,
      dob: body.dob ? new Date(body.dob) : null,
      relationship: body.relationship,
      monthsLived: body.monthsLived || 12,
    },
  })
  return NextResponse.json({ data: dependent }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const taxReturn = await prisma.taxReturn.findUnique({ where: { id: params.id } })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const dependents = await prisma.dependent.findMany({ where: { clientId: taxReturn.clientId } })
  return NextResponse.json({ data: dependents })
}
