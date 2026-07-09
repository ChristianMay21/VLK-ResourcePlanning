import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { ProjectPhase, Task } from '@/payload-types'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const task = await payload.findByID({
    collection: 'tasks',
    id,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.name != null) data.name = String(body.name).trim()
  if (body.startDate != null) data.startDate = body.startDate
  if (body.endDate != null) data.endDate = body.endDate

  // Validate task dates against parent phase bounds
  if ((body.startDate != null || body.endDate != null) && task.phase) {
    const phaseId = typeof task.phase === 'string' ? task.phase : (task.phase as { id: string }).id
    const phase = await payload.findByID({
      collection: 'project-phases',
      id: phaseId,
      depth: 0,
      overrideAccess: true,
    }).catch(() => null) as ProjectPhase | null

    if (phase) {
      const phaseStart = phase.startDate.slice(0, 10)
      const phaseEnd = phase.endDate.slice(0, 10)
      const newStart = ((body.startDate ?? task.startDate) as string).slice(0, 10)
      const newEnd = ((body.endDate ?? task.endDate) as string).slice(0, 10)
      if (newStart < phaseStart) {
        return NextResponse.json({ error: `Start date cannot be before phase start (${phaseStart})` }, { status: 400 })
      }
      if (newEnd > phaseEnd) {
        return NextResponse.json({ error: `End date cannot be after phase end (${phaseEnd})` }, { status: 400 })
      }
    }
  }

  const updated = await payload.update({
    collection: 'tasks',
    id,
    data,
    overrideAccess: true,
  })

  return NextResponse.json({ id: updated.id })
}

export async function DELETE(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  const task = await payload.findByID({
    collection: 'tasks',
    id,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete all assignments on this task
  const { docs: taskAssignments } = await payload.find({
    collection: 'assignments',
    where: {
      and: [
        { 'workItem.relationTo': { equals: 'tasks' } },
        { 'workItem.value': { equals: id } },
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  for (const a of taskAssignments) {
    await payload.delete({ collection: 'assignments', id: a.id, overrideAccess: true })
  }

  // Remove this task from its parent phase's tasks array
  const phaseRef = task.phase
  const phaseId = typeof phaseRef === 'string' ? phaseRef : typeof phaseRef === 'object' && phaseRef ? (phaseRef as { id: string }).id : null

  if (phaseId) {
    const phase = await payload.findByID({
      collection: 'project-phases',
      id: phaseId,
      depth: 0,
      overrideAccess: true,
    }).catch(() => null) as ProjectPhase | null

    if (phase) {
      const remaining = (phase.tasks ?? [])
        .map((t: string | Task) => (typeof t === 'string' ? t : t.id))
        .filter((tid: string) => tid !== id)

      await payload.update({
        collection: 'project-phases',
        id: phaseId,
        data: { tasks: remaining },
        overrideAccess: true,
      })
    }
  }

  await payload.delete({ collection: 'tasks', id, overrideAccess: true })

  return NextResponse.json({ success: true })
}
