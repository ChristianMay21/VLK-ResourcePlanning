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

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { workItemType, workItemId, employeeId, roleId, hours, description, rate, projectId } = body

  if (!workItemType || !workItemId || !employeeId || !roleId || hours == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const relationTo = workItemType === 'project' ? 'projects'
    : workItemType === 'phase' ? 'project-phases'
    : 'tasks'

  const payload = await getPayload({ config: await config })

  const assignment = await payload.create({
    collection: 'assignments',
    data: {
      workItem: { relationTo, value: workItemId },
      employee: employeeId,
      role: roleId,
      hours: Number(hours),
      description: description ?? undefined,
      rate: rate != null ? Number(rate) : undefined,
    },
    overrideAccess: true,
  })

  if (rate != null && projectId) {
    await syncProjectRate(payload, employeeId, projectId, Number(rate), assignment.id)
  }

  return NextResponse.json(assignment, { status: 201 })
}
