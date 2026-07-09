import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const role = await payload.create({ collection: 'roles', data: { name: name.trim() }, overrideAccess: true })
  return NextResponse.json(role, { status: 201 })
}
