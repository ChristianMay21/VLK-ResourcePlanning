import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim() || !body.clientId || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'Name, client, startDate, and endDate are required' }, { status: 400 })
  }

  const payload = await getPayload({ config: await config })

  const created = await payload.create({
    collection: 'projects',
    data: {
      name: body.name.trim(),
      client: body.clientId,
      sector: body.sectorId || undefined,
      budget: body.budget ?? undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      isComplete: false,
    },
    overrideAccess: true,
  })

  return NextResponse.json({ id: created.id }, { status: 201 })
}
