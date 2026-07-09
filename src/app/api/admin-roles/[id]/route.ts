import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Role, Task } from '@/payload-types'

type AllowedOn = 'projects' | 'project-phases' | 'tasks' | 'internal'
type Params = { id: string }

const ALL_TYPES: AllowedOn[] = ['projects', 'project-phases', 'tasks', 'internal']

// Returns how many assignments use this role on the given work item type.
// For 'internal', task assignments are counted only if the task has a category set.
async function countConflicts(
  payload: Parameters<typeof import('payload').getPayload>[0] extends never ? never : Awaited<ReturnType<typeof import('payload').getPayload>>,
  roleId: string,
  type: AllowedOn,
): Promise<number> {
  if (type === 'internal') {
    const { docs } = await payload.find({
      collection: 'assignments',
      where: {
        and: [
          { role: { equals: roleId } },
          { 'workItem.relationTo': { equals: 'tasks' } },
        ],
      },
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    })
    // Filter to only tasks that have a category (internal tasks)
    const taskIds = docs.map(a => typeof a.workItem.value === 'string' ? a.workItem.value : (a.workItem.value as { id: string })?.id).filter(Boolean)
    if (taskIds.length === 0) return 0
    const { totalDocs } = await payload.find({
      collection: 'tasks',
      where: { and: [{ id: { in: taskIds } }, { category: { exists: true } }] },
      limit: 0,
      overrideAccess: true,
    })
    return totalDocs
  }

  const collectionSlug = type === 'projects' ? 'projects'
    : type === 'project-phases' ? 'project-phases'
    : 'tasks'

  // For 'tasks' type: only count task assignments where task has NO category (project tasks)
  if (type === 'tasks') {
    const { docs } = await payload.find({
      collection: 'assignments',
      where: {
        and: [
          { role: { equals: roleId } },
          { 'workItem.relationTo': { equals: 'tasks' } },
        ],
      },
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    })
    const taskIds = docs.map(a => typeof a.workItem.value === 'string' ? a.workItem.value : (a.workItem.value as { id: string })?.id).filter(Boolean)
    if (taskIds.length === 0) return 0
    const { totalDocs } = await payload.find({
      collection: 'tasks',
      where: { and: [{ id: { in: taskIds } }, { category: { exists: false } }] },
      limit: 0,
      overrideAccess: true,
    })
    return totalDocs
  }

  const { totalDocs } = await payload.find({
    collection: 'assignments',
    where: {
      and: [
        { role: { equals: roleId } },
        { 'workItem.relationTo': { equals: collectionSlug } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  })
  return totalDocs
}

async function deleteConflicts(
  payload: Parameters<typeof import('payload').getPayload>[0] extends never ? never : Awaited<ReturnType<typeof import('payload').getPayload>>,
  roleId: string,
  type: AllowedOn,
): Promise<void> {
  const collectionSlug = (type === 'projects' || type === 'project-phases') ? type : 'tasks'

  const { docs } = await payload.find({
    collection: 'assignments',
    where: {
      and: [
        { role: { equals: roleId } },
        { 'workItem.relationTo': { equals: collectionSlug } },
      ],
    },
    limit: 10000,
    depth: 0,
    overrideAccess: true,
  })

  // For tasks/internal: filter by whether the task has a category
  let toDelete = docs
  if (type === 'tasks' || type === 'internal') {
    const taskIds = docs.map(a => typeof a.workItem.value === 'string' ? a.workItem.value : (a.workItem.value as { id: string })?.id).filter(Boolean)
    if (taskIds.length === 0) return
    const { docs: matchingTasks } = await payload.find({
      collection: 'tasks',
      where: {
        and: [
          { id: { in: taskIds } },
          type === 'internal' ? { category: { exists: true } } : { category: { exists: false } },
        ],
      },
      limit: 10000,
      overrideAccess: true,
    })
    const matchingTaskIds = new Set(matchingTasks.map((t: Task) => t.id))
    toDelete = docs.filter(a => {
      const wvId = typeof a.workItem.value === 'string' ? a.workItem.value : (a.workItem.value as { id: string })?.id
      return wvId && matchingTaskIds.has(wvId)
    })
  }

  for (const a of toDelete) {
    await payload.delete({ collection: 'assignments', id: a.id, overrideAccess: true })
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const name = body.name?.trim()
  const allowedOn: AllowedOn[] = (body.allowedOn ?? []).filter((v: string) => ALL_TYPES.includes(v as AllowedOn))
  const force: boolean = body.force === true

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (allowedOn.length === 0) return NextResponse.json({ error: 'At least one work item type required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const { docs: existing } = await payload.find({
    collection: 'roles',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })
  }

  const current = await payload.findByID({ collection: 'roles', id, overrideAccess: true }) as Role
  const currentAllowedOn: AllowedOn[] = (current.allowedOn as AllowedOn[]) ?? ALL_TYPES
  const removedTypes = currentAllowedOn.filter(t => !allowedOn.includes(t))

  if (removedTypes.length > 0) {
    const conflicts: { type: AllowedOn; count: number }[] = []
    for (const type of removedTypes) {
      const count = await countConflicts(payload, id, type)
      if (count > 0) conflicts.push({ type, count })
    }

    if (conflicts.length > 0 && !force) {
      return NextResponse.json({ conflict: true, conflicts }, { status: 409 })
    }

    if (force) {
      for (const { type } of conflicts) {
        await deleteConflicts(payload, id, type)
      }
    }
  }

  const updated = await payload.update({ collection: 'roles', id, data: { name, allowedOn }, overrideAccess: true })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const force = req.nextUrl.searchParams.get('force') === 'true'
  const payload = await getPayload({ config: await config })

  const { docs: assignments, totalDocs } = await payload.find({
    collection: 'assignments',
    where: { role: { equals: id } },
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

  await payload.delete({ collection: 'roles', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
}
