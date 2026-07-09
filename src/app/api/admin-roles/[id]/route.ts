import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Role } from '@/payload-types'

type AllowedOn = 'projects' | 'project-phases' | 'tasks'
type Params = { id: string }

const ALL_TYPES: AllowedOn[] = ['projects', 'project-phases', 'tasks']

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const name = body.name?.trim()
  const allowedOn: AllowedOn[] = (body.allowedOn ?? []).filter((v: string) => ALL_TYPES.includes(v as AllowedOn))
  const force: boolean = body.force === true

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (allowedOn.length === 0) return NextResponse.json({ error: 'At least one work item type required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  // Duplicate name check (excluding self)
  const { docs: existing } = await payload.find({
    collection: 'roles',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })
  }

  // Detect which types are being removed
  const current = await payload.findByID({ collection: 'roles', id, overrideAccess: true }) as Role
  const currentAllowedOn: AllowedOn[] = current.allowedOn ?? ALL_TYPES
  const removedTypes = currentAllowedOn.filter(t => !allowedOn.includes(t))

  if (removedTypes.length > 0) {
    // Check for assignments on each removed type
    const conflicts: { type: AllowedOn; count: number }[] = []
    for (const type of removedTypes) {
      const { totalDocs } = await payload.find({
        collection: 'assignments',
        where: {
          and: [
            { role: { equals: id } },
            { 'workItem.relationTo': { equals: type } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      })
      if (totalDocs > 0) conflicts.push({ type, count: totalDocs })
    }

    if (conflicts.length > 0 && !force) {
      return NextResponse.json({ conflict: true, conflicts }, { status: 409 })
    }

    if (force) {
      for (const { type } of conflicts) {
        const { docs: toDelete } = await payload.find({
          collection: 'assignments',
          where: {
            and: [
              { role: { equals: id } },
              { 'workItem.relationTo': { equals: type } },
            ],
          },
          limit: 10000,
          overrideAccess: true,
        })
        for (const a of toDelete) {
          await payload.delete({ collection: 'assignments', id: a.id, overrideAccess: true })
        }
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
