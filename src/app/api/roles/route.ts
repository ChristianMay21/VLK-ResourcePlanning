import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({ collection: 'roles', limit: 100 })
  return NextResponse.json(docs)
}
