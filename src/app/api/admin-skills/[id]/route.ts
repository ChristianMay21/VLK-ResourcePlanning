import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, ProjectPhase, Task } from '@/payload-types'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const current = await payload.findByID({ collection: 'skills', id, overrideAccess: true })
  const oldName = (current as { name: string }).name
  const newName = name.trim()

  const updated = await payload.update({ collection: 'skills', id, data: { name: newName }, overrideAccess: true })

  if (oldName !== newName) {
    // Cascade to employee skills
    const { docs: employees } = await payload.find({ collection: 'employees', limit: 500, overrideAccess: true })
    for (const emp of employees) {
      const items = ((emp as Employee).skills ?? [])
      if (items.some(s => s.skill === oldName)) {
        await payload.update({
          collection: 'employees',
          id: emp.id,
          data: { skills: items.map(s => s.skill === oldName ? { ...s, skill: newName } : s) },
          overrideAccess: true,
        })
      }
    }

    // Cascade to phase requiredSkills
    const { docs: phases } = await payload.find({ collection: 'project-phases', limit: 1000, overrideAccess: true })
    for (const phase of phases) {
      const items = ((phase as ProjectPhase).requiredSkills ?? [])
      if (items.some(s => s.skill === oldName)) {
        await payload.update({
          collection: 'project-phases',
          id: phase.id,
          data: { requiredSkills: items.map(s => s.skill === oldName ? { ...s, skill: newName } : s) },
          overrideAccess: true,
        })
      }
    }

    // Cascade to task requiredSkills
    const { docs: tasks } = await payload.find({ collection: 'tasks', limit: 2000, overrideAccess: true })
    for (const task of tasks) {
      const items = ((task as Task).requiredSkills ?? [])
      if (items && items.some(s => s.skill === oldName)) {
        await payload.update({
          collection: 'tasks',
          id: task.id,
          data: { requiredSkills: items.map(s => s.skill === oldName ? { ...s, skill: newName } : s) },
          overrideAccess: true,
        })
      }
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  const skill = await payload.findByID({ collection: 'skills', id, overrideAccess: true })
  const skillName = (skill as { name: string }).name

  const { docs: employees } = await payload.find({ collection: 'employees', limit: 500, overrideAccess: true })
  if (employees.some((e: unknown) => ((e as Employee).skills ?? []).some(s => s.skill === skillName))) {
    return NextResponse.json({ error: 'Skill is referenced by employees', inUse: true }, { status: 409 })
  }

  const { docs: phases } = await payload.find({ collection: 'project-phases', limit: 1000, overrideAccess: true })
  if (phases.some((p: unknown) => ((p as ProjectPhase).requiredSkills ?? []).some(s => s.skill === skillName))) {
    return NextResponse.json({ error: 'Skill is required by phases', inUse: true }, { status: 409 })
  }

  const { docs: tasks } = await payload.find({ collection: 'tasks', limit: 2000, overrideAccess: true })
  if (tasks.some((t: unknown) => ((t as Task).requiredSkills ?? []).some(s => s.skill === skillName))) {
    return NextResponse.json({ error: 'Skill is required by tasks', inUse: true }, { status: 409 })
  }

  await payload.delete({ collection: 'skills', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
}
