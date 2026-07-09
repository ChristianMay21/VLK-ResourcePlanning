import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const phase = await payload.findByID({
    collection: 'project-phases',
    id,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)

  if (!phase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const budgetAllocation = body.budgetAllocation != null ? Number(body.budgetAllocation) : null

  const updated = await payload.update({
    collection: 'project-phases',
    id,
    data: { budgetAllocation: budgetAllocation ?? undefined },
    overrideAccess: true,
  })

  return NextResponse.json({ id: updated.id, budgetAllocation: updated.budgetAllocation ?? null })
}
