/**
 * TaxApp — Route Auth Helper
 *
 * Wraps NextAuth getServerSession() and provides role-based guards
 * for API routes. Use requireSession() at the top of every route handler.
 *
 * Setup: install next-auth and configure authOptions in src/lib/auth.ts
 *   npm install next-auth
 */

import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { Role } from "@prisma/client"
import { unauthorized, forbidden } from "@/src/lib/apiHelpers"
import { NextResponse } from "next/server"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  firmId: string | null
}

type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }

/**
 * Require a valid session. Optionally restrict to specific roles.
 *
 * Usage in a route:
 *   const auth = await requireSession(["PREPARER", "ADMIN"])
 *   if (!auth.ok) return auth.response
 *   const { user } = auth
 */
export async function requireSession(
  allowedRoles?: Role[],
): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { ok: false, response: unauthorized() }
  }

  const user = session.user as SessionUser

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      ),
    }
  }

  return { ok: true, user }
}

/**
 * Returns true if the actor can access a resource belonging to clientId.
 * Preparers/admins can access any client in their firm.
 * Filers can only access their own client record.
 */
export async function canAccessClient(
  user: SessionUser,
  clientId: string,
): Promise<boolean> {
  if (user.role === "PREPARER" || user.role === "ADMIN") {
    // Any preparer in the firm can access
    const { prisma } = await import("@/src/lib/prisma")
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    return client?.firmId === user.firmId
  }

  if (user.role === "FILER") {
    const { prisma } = await import("@/src/lib/prisma")
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    return client?.userId === user.id
  }

  return false
}
