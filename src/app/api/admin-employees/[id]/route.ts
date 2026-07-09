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
    baseHourlyRate: emp.baseHourlyRate ?? null,
    color: emp.color ?? null,
    managerId: emp.manager && typeof emp.manager === 'string' ? emp.manager : null,
    skills: (emp.skills ?? []).map(s => s.skill),
    sectorExperience: (emp.sectorExperience ?? []).map(s => s.sector),
  })
}

export async function DELETE(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const force = req.nextUrl.searchParams.get('force') === 'true'
  const payload = await getPayload({ config: await config })

  const { docs: assignments, totalDocs } = await payload.find({
    collection: 'assignments',
    where: { employee: { equals: id } },
    limit: force ? 10000 : 0,
    overrideAccess: true,
  })

  if (totalDocs > 0 && !force) {
    return NextResponse.json({ conflict: true, totalAssignments: totalDocs }, { status: 409 })
  }

  if (force) {
    for (const a of assignments) {
      await payload.delete({ collection: 'assignments', id: a.id, overrideAccess: true })
    }
  }

  await payload.delete({ collection: 'employees', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
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
