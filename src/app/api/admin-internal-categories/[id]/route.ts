import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const { docs: existing } = await payload.find({
    collection: 'internal-work-categories',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 })
  }

  const updated = await payload.update({
    collection: 'internal-work-categories',
    id,
    data: { name },
    overrideAccess: true,
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  const { totalDocs } = await payload.find({
    collection: 'tasks',
    where: { category: { equals: id } },
    limit: 0,
    overrideAccess: true,
  })

  if (totalDocs > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${totalDocs} task${totalDocs !== 1 ? 's' : ''} belong to this category` },
      { status: 409 },
    )
  }

  await payload.delete({ collection: 'internal-work-categories', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
}
