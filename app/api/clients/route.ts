import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { z } from "zod"

const CreateClientSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email().optional().or(z.literal("")),
  phone:     z.string().optional(),
  address:   z.string().optional(),
  city:      z.string().optional(),
  state:     z.string().optional(),
  zip:       z.string().optional(),
  ssn:       z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  const user = session.user as any

  const clients = await prisma.client.findMany({
    where: { firmId: user.firmId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: { clients } })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  const user = session.user as any

  const body = CreateClientSchema.parse(await req.json())

  const client = await prisma.client.create({
    data: {
      firmId:    user.firmId,
      firstName: body.firstName,
      lastName:  body.lastName,
      email:     body.email || null,
      phone:     body.phone || null,
      address:   body.address || null,
      city:      body.city || null,
      state:     body.state || null,
      zip:       body.zip || null,
      ssn:       body.ssn || null,
    },
  })

  return NextResponse.json({ data: client }, { status: 201 })
}
