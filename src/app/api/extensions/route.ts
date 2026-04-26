import { NextRequest } from 'next/server'
import { GET_list, POST_create } from '@/api/routes/extensions'
export const GET = (req: NextRequest) => GET_list(req)
export const POST = (req: NextRequest) => POST_create(req)
