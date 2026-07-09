import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const { roleId, hours, description } = body

  const payload = await getPayload({ config: await config })

  const updated = await payload.update({
    collection: 'assignments',
    id,
    data: {
      ...(roleId !== undefined ? { role: roleId } : {}),
      ...(hours !== undefined ? { hours: Number(hours) } : {}),
      ...(description !== undefined ? { description } : {}),
    },
    overrideAccess: true,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params

  const payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'assignments', id, overrideAccess: true })

  return NextResponse.json({ deleted: true })
}
