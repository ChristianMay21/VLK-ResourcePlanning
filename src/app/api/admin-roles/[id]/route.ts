import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const updated = await payload.update({ collection: 'roles', id, data: { name: name.trim() }, overrideAccess: true })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  // Check if any assignments use this role
  const { totalDocs } = await payload.find({
    collection: 'assignments',
    where: { role: { equals: id } },
    limit: 1,
    overrideAccess: true,
  })

  if (totalDocs > 0) {
    return NextResponse.json({ error: 'Role is in use', inUse: true }, { status: 409 })
  }

  await payload.delete({ collection: 'roles', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
}
