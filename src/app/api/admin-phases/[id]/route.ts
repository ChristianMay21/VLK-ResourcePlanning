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

  const data: Record<string, unknown> = {}
  if (body.budgetAllocation != null) data.budgetAllocation = Number(body.budgetAllocation)
  if (body.name != null) data.name = String(body.name).trim()
  if (body.startDate != null) data.startDate = body.startDate
  if (body.endDate != null) data.endDate = body.endDate

  const updated = await payload.update({
    collection: 'project-phases',
    id,
    data,
    overrideAccess: true,
  })

  return NextResponse.json({ id: updated.id })
}
