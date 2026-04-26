import { NextRequest } from 'next/server'
import { GET_single } from '@/api/routes/extensions'
export const GET = (req: NextRequest, ctx: any) => GET_single(req, ctx)
