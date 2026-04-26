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
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
})