import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const { totalDocs } = await payload.find({
    collection: 'roles',
    where: { name: { equals: name.trim() } },
    limit: 1,
    overrideAccess: true,
  })
  if (totalDocs > 0) {
    return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })
  }

  const role = await payload.create({ collection: 'roles', data: { name: name.trim() }, overrideAccess: true })
  return NextResponse.json(role, { status: 201 })
}
