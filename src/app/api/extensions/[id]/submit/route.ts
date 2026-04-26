import { NextRequest } from 'next/server'
import { POST_submit } from '@/api/routes/extensions'
export const POST = (req: NextRequest, ctx: any) => POST_submit(req, ctx)
