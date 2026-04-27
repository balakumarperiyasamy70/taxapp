import { NextRequest } from 'next/server'
import { POST_transition } from '@/src/api/routes/returns'
export const POST = (req: NextRequest, ctx: any) => POST_transition(req, ctx)
