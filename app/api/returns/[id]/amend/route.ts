import { NextRequest } from 'next/server'
import { POST_amend } from '@/src/api/routes/returns'
export const POST = (req: NextRequest, ctx: any) => POST_amend(req, ctx)
