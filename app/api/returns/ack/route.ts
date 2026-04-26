import { NextRequest } from 'next/server'
import { POST_ack } from '@/api/routes/returns'
export const POST = (req: NextRequest) => POST_ack(req)
