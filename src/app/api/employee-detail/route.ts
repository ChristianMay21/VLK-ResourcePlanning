import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, Project, ProjectPhase, Role, Task } from '@/payload-types'

function resolveId(val: string | { id: string }): string {
  return typeof val === 'string' ? val : val.id
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const [employeeResult, { docs: empAssignments }, { docs: projects }, { docs: phases }] = await Promise.all([
    payload.findByID({ collection: 'employees', id, depth: 1, overrideAccess: true }).catch(() => null),
    payload.find({
      collection: 'assignments',
      where: { employee: { equals: id } },
      depth: 1,
      limit: 1000,
      overrideAccess: true,
    }),
    payload.find({ collection: 'projects', depth: 0, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'project-phases', depth: 1, limit: 1000, overrideAccess: true }),
  ])

  if (!employeeResult) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const emp = employeeResult as Employee

  // Build phase → project mapping
  const phaseToProject: Record<string, { projectId: string; projectName: string }> = {}
  for (const project of projects) {
    for (const phase of (project.phases ?? [])) {
      phaseToProject[resolveId(phase as string | ProjectPhase)] = {
        projectId: project.id,
        projectName: project.name,
      }
    }
  }

  // Build task → project mapping via phases
  const taskToProject: Record<string, { projectId: string; projectName: string }> = {}
  for (const phase of phases) {
    const proj = phaseToProject[phase.id]
    if (!proj) continue
    for (const task of (phase.tasks ?? [])) {
      taskToProject[resolveId(task as string | Task)] = proj
    }
  }

  // Build assignments for utilization (dates + hours)
  type AssignmentForUtil = { hours: number; startDate: string; endDate: string }
  const assignmentsForUtil: AssignmentForUtil[] = []

  // Build assigned work grouped by project
  type WorkEntry = {
    id: string
    type: 'project' | 'phase' | 'task'
    name: string
    roleName: string
    hours: number
  }
  const byProject: Record<string, { projectId: string; projectName: string; items: WorkEntry[] }> = {}

  for (const assignment of empAssignments) {
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue
    const wItem = wv as { id: string; name: string; startDate?: string; endDate?: string }

    if (wItem.startDate && wItem.endDate) {
      assignmentsForUtil.push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
    }

    const role = assignment.role
    const roleName = typeof role === 'object' ? (role as Role).name : ''

    let projectId = ''
    let projectName = ''
    let workType: 'project' | 'phase' | 'task' = 'project'

    if (assignment.workItem.relationTo === 'projects') {
      const proj = wv as Project
      projectId = proj.id
      projectName = proj.name
      workType = 'project'
    } else if (assignment.workItem.relationTo === 'project-phases') {
      const info = phaseToProject[wItem.id]
      if (!info) continue
      projectId = info.projectId
      projectName = info.projectName
      workType = 'phase'
    } else if (assignment.workItem.relationTo === 'tasks') {
      const info = taskToProject[wItem.id]
      if (!info) continue
      projectId = info.projectId
      projectName = info.projectName
      workType = 'task'
    }

    if (!projectId) continue
    if (!byProject[projectId]) byProject[projectId] = { projectId, projectName, items: [] }
    byProject[projectId].items.push({ id: wItem.id, type: workType, name: wItem.name, roleName, hours: assignment.hours })
  }

  const manager = emp.manager && typeof emp.manager === 'object' ? emp.manager as Employee : null

  return NextResponse.json({
    employee: {
      id: emp.id,
      name: emp.name,
      color: emp.color ?? null,
      jobTitle: emp.jobTitle ?? null,
      capacity: emp.maximumHours ?? 40,
      managerId: manager ? manager.id : null,
      managerName: manager ? manager.name : null,
    },
    assignmentsForUtil,
    assignedWork: Object.values(byProject),
  })
}
