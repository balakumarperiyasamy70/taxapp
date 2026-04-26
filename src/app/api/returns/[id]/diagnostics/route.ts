import { NextRequest } from 'next/server'
import { GET_diagnostics } from '@/api/routes/returns'
export const GET = (req: NextRequest, ctx: any) => GET_diagnostics(req, ctx)
