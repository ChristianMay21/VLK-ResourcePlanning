import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Project, ProjectPhase, Task } from '@/payload-types'

type Params = { id: string }

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  const project = await payload.findByID({
    collection: 'projects',
    id,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null) as Project | null

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const phaseIds = (project.phases ?? []).map(
    (p: string | ProjectPhase) => (typeof p === 'string' ? p : p.id),
  )

  const taskIds: string[] = []
  if (phaseIds.length > 0) {
    const { docs: tasks } = await payload.find({
      collection: 'tasks',
      where: { phase: { in: phaseIds } },
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    })
    taskIds.push(...tasks.map((t: Task) => t.id))
  }

  // Delete all assignments on the project, its phases, and its tasks
  const workItemIds = [id, ...phaseIds, ...taskIds]
  for (const workItemId of workItemIds) {
    const { docs: assignments } = await payload.find({
      collection: 'assignments',
      where: { 'workItem.value': { equals: workItemId } },
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    })
    for (const a of assignments) {
      await payload.delete({ collection: 'assignments', id: a.id, overrideAccess: true })
    }
  }

  // Delete tasks, then phases, then project
  for (const taskId of taskIds) {
    await payload.delete({ collection: 'tasks', id: taskId, overrideAccess: true })
  }
  for (const phaseId of phaseIds) {
    await payload.delete({ collection: 'project-phases', id: phaseId, overrideAccess: true })
  }
  await payload.delete({ collection: 'projects', id, overrideAccess: true })

  return NextResponse.json({ deleted: true })
}
