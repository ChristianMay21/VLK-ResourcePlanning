import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee } from '@/payload-types'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const current = await payload.findByID({
    collection: 'employees',
    id,
    depth: 0,
    overrideAccess: true,
  }) as Employee

  const data: Record<string, unknown> = {}

  if (body.addSkill) {
    const existing = (current.skills ?? []).map(s => s.skill)
    if (!existing.includes(body.addSkill)) {
      data.skills = [...(current.skills ?? []), { skill: body.addSkill }]
    }
  }

  if (body.addSector) {
    const existing = (current.sectorExperience ?? []).map(s => s.sector)
    if (!existing.includes(body.addSector)) {
      data.sectorExperience = [...(current.sectorExperience ?? []), { sector: body.addSector }]
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nothing to update' })
  }

  const updated = await payload.update({
    collection: 'employees',
    id,
    data,
    overrideAccess: true,
  })

  return NextResponse.json(updated)
}
