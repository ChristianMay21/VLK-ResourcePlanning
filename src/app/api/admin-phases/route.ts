import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Project, ProjectPhase } from '@/payload-types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = body.name?.trim()
  const startDate: string = body.startDate
  const endDate: string = body.endDate
  const projectId: string = body.projectId

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!startDate || !endDate) return NextResponse.json({ error: 'Start and end date required' }, { status: 400 })
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  // Validate phase dates fall within project bounds
  const parentProject = await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null) as Project | null

  if (parentProject) {
    const projectStart = parentProject.startDate.slice(0, 10)
    const projectEnd = parentProject.endDate.slice(0, 10)
    if (startDate < projectStart) {
      return NextResponse.json({ error: `Start date cannot be before project start (${projectStart})` }, { status: 400 })
    }
    if (endDate > projectEnd) {
      return NextResponse.json({ error: `End date cannot be after project end (${projectEnd})` }, { status: 400 })
    }
  }

  const phase = await payload.create({
    collection: 'project-phases',
    data: { name, startDate, endDate },
    overrideAccess: true,
  })

  const project = await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 0,
    overrideAccess: true,
  }) as Project

  const existingPhaseIds = (project.phases ?? []).map(
    (p: string | ProjectPhase) => (typeof p === 'string' ? p : p.id),
  )

  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { phases: [...existingPhaseIds, phase.id] },
    overrideAccess: true,
  })

  return NextResponse.json(phase, { status: 201 })
}
