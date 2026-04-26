/**
 * Prisma client singleton
 *
 * In Next.js development, hot-reload creates new module instances on every
 * file save. Without this pattern each reload opens a new connection pool,
 * exhausting the database's connection limit quickly.
 *
 * This stores the client on the global object in development only.
 * In production each serverless function instance gets exactly one client.
 */

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
