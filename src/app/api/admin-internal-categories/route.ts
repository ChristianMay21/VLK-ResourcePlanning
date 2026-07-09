import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const { totalDocs } = await payload.find({
    collection: 'internal-work-categories',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (totalDocs > 0) {
    return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 })
  }

  const created = await payload.create({
    collection: 'internal-work-categories',
    data: { name },
    overrideAccess: true,
  })
  return NextResponse.json(created, { status: 201 })
}
