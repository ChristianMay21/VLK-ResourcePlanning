import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Payload } from 'payload'
import type { Project } from '@/payload-types'

async function syncProjectRate(
  payload: Payload,
  employeeId: string,
  projectId: string,
  rate: number,
  excludeId?: string,
) {
  const project = await payload.findByID({
    collection: 'projects', id: projectId, depth: 0, overrideAccess: true,
  }) as Project

  const phaseIds = (project.phases ?? []).map(
    (p: string | { id: string }) => (typeof p === 'string' ? p : p.id),
  )

  const taskIds: string[] = []
  if (phaseIds.length > 0) {
    const { docs: tasks } = await payload.find({
      collection: 'tasks',
      where: { phase: { in: phaseIds } },
      limit: 10000,
      overrideAccess: true,
    })
    taskIds.push(...tasks.map((t: { id: string }) => t.id))
  }

  const projectWorkItemIds = new Set([projectId, ...phaseIds, ...taskIds])

  const { docs: empAssignments } = await payload.find({
    collection: 'assignments',
    where: { employee: { equals: employeeId } },
    limit: 10000,
    depth: 0,
    overrideAccess: true,
  })

  for (const a of empAssignments) {
    if (a.id === excludeId) continue
    const wvId = typeof a.workItem.value === 'string'
      ? a.workItem.value
      : (a.workItem.value as { id: string } | null)?.id
    if (wvId && projectWorkItemIds.has(wvId)) {
      await payload.update({ collection: 'assignments', id: a.id, data: { rate }, overrideAccess: true })
    }
  }
}

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const { roleId, hours, description, rate, projectId, employeeId } = body

  const payload = await getPayload({ config: await config })

  const updated = await payload.update({
    collection: 'assignments',
    id,
    data: {
      ...(roleId !== undefined ? { role: roleId } : {}),
      ...(hours !== undefined ? { hours: Number(hours) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(rate !== undefined ? { rate: Number(rate) } : {}),
    },
    overrideAccess: true,
  })

  if (rate != null && projectId && employeeId) {
    await syncProjectRate(payload, employeeId, projectId, Number(rate), id)
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params

  const payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'assignments', id, overrideAccess: true })

  return NextResponse.json({ deleted: true })
}
