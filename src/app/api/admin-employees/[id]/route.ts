import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee } from '@/payload-types'

type Params = { id: string }

export async function GET(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  const emp = await payload.findByID({
    collection: 'employees',
    id,
    depth: 0,
    overrideAccess: true,
  }) as Employee

  return NextResponse.json({
    id: emp.id,
    name: emp.name,
    jobTitle: emp.jobTitle ?? null,
    maximumHours: emp.maximumHours,
    baseHourlyRate: emp.baseHourlyRate ?? 150,
    color: emp.color ?? null,
    managerId: emp.manager && typeof emp.manager === 'string' ? emp.manager : null,
    skills: (emp.skills ?? []).map(s => s.skill),
    sectorExperience: (emp.sectorExperience ?? []).map(s => s.sector),
  })
}

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const updated = await payload.update({
    collection: 'employees',
    id,
    data: {
      name: body.name,
      jobTitle: body.jobTitle ?? undefined,
      manager: body.manager || undefined,
      maximumHours: body.maximumHours ?? 40,
      baseHourlyRate: body.baseHourlyRate ?? undefined,
      color: body.color ?? undefined,
      skills: body.skills ?? [],
      sectorExperience: body.sectorExperience ?? [],
    },
    overrideAccess: true,
  })

  return NextResponse.json(updated)
}
