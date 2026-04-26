import { NextRequest } from 'next/server'
import { GET_single, PATCH_update } from '@/api/routes/returns'
export const GET = (req: NextRequest, ctx: any) => GET_single(req, ctx)
export const PATCH = (req: NextRequest, ctx: any) => PATCH_update(req, ctx)
