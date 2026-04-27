import { NextRequest } from 'next/server'
import { POST_ack } from '@/src/api/routes/extensions'
export const POST = (req: NextRequest) => POST_ack(req)
