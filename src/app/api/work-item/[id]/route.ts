import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, InternalWorkCategory, Project, ProjectPhase, Role, Sector, Task } from '@/payload-types'
import { deriveStatus } from '@/lib/dateUtils'

type Params = { id: string }

function resolveId(val: string | { id: string }): string {
  return typeof val === 'string' ? val : val.id
}

type TeamMember = {
  assignmentId: string
  employeeId: string
  employeeName: string
  employeeColor: string | null
  roleId: string
  roleName: string
  hours: number
  rate: number | null
  description: string | null
  skills: string[]
  sectorExperience: string[]
}

export async function GET(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const type = req.nextUrl.searchParams.get('type') as 'phase' | 'task' | null
  if (!type || (type !== 'phase' && type !== 'task')) {
    return NextResponse.json({ error: 'type must be phase or task' }, { status: 400 })
  }

  const payload = await getPayload({ config: await config })

  const [workItemResult, { docs: allProjects }, { docs: allPhases }] = await Promise.all([
    type === 'phase'
      ? payload.findByID({ collection: 'project-phases', id, depth: 1, overrideAccess: true }).catch(() => null)
      : payload.findByID({ collection: 'tasks', id, depth: 1, overrideAccess: true }).catch(() => null),
    payload.find({ collection: 'projects', depth: 1, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'project-phases', depth: 1, limit: 1000, overrideAccess: true }),
  ])

  if (!workItemResult) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if this is an internal task
  const isInternalTask = type === 'task' && !!(workItemResult as Task).category

  // Build phase → project lookup (for non-internal tasks)
  const phaseToProject: Record<string, Project> = {}
  for (const project of allProjects) {
    for (const phase of (project.phases ?? [])) {
      phaseToProject[resolveId(phase as string | ProjectPhase)] = project as Project
    }
  }

  let project: Project | null = null
  let category: InternalWorkCategory | null = null

  if (isInternalTask) {
    const task = workItemResult as Task
    const cat = task.category
    category = typeof cat === 'object' && cat !== null ? cat as InternalWorkCategory : null
  } else if (type === 'phase') {
    project = phaseToProject[id] ?? null
  } else {
    const task = workItemResult as Task
    const phaseVal = task.phase
    const phaseId = phaseVal ? resolveId(phaseVal as string | ProjectPhase) : null
    if (phaseId) project = phaseToProject[phaseId] ?? null
  }

  if (!isInternalTask && !project) {
    return NextResponse.json({ error: 'Parent project not found' }, { status: 404 })
  }

  const projectSectorName = project?.sector && typeof project.sector === 'object'
    ? (project.sector as Sector).name
    : null

  // Build gantt bars (only for project-linked items)
  type GanttBar = {
    id: string; label: string; type: 'phase' | 'task'
    status: 'upcoming' | 'active' | 'complete'; startDate: string; endDate: string
  }
  const ganttBars: GanttBar[] = []

  if (project) {
    const projectPhaseIds = (project.phases ?? []).map(p => resolveId(p as string | ProjectPhase))
    const sortedPhases = projectPhaseIds
      .map(pid => allPhases.find(ph => ph.id === pid))
      .filter((ph): ph is ProjectPhase => Boolean(ph))

    for (const phase of sortedPhases) {
      ganttBars.push({
        id: phase.id, label: phase.name, type: 'phase',
        status: deriveStatus(phase.startDate, phase.endDate),
        startDate: phase.startDate, endDate: phase.endDate,
      })
      for (const task of (phase.tasks ?? [])) {
        if (typeof task !== 'object') continue
        const t = task as Task
        ganttBars.push({
          id: t.id, label: t.name, type: 'task',
          status: deriveStatus(t.startDate, t.endDate, t.completed),
          startDate: t.startDate, endDate: t.endDate,
        })
      }
    }
  }

  // Fetch direct assignments
  const { docs: directAssignmentDocs } = await payload.find({
    collection: 'assignments',
    where: {
      and: [
        { 'workItem.relationTo': { equals: type === 'phase' ? 'project-phases' : 'tasks' } },
        { 'workItem.value': { equals: id } },
      ],
    },
    depth: 1,
    limit: 1000,
    overrideAccess: true,
  })

  function toTeamMember(doc: (typeof directAssignmentDocs)[0]): TeamMember | null {
    const emp = doc.employee
    if (typeof emp !== 'object') return null
    const e = emp as Employee
    const role = doc.role
    return {
      assignmentId: doc.id,
      employeeId: e.id,
      employeeName: e.name,
      employeeColor: e.color ?? null,
      roleId: typeof role === 'object' ? (role as Role).id : '',
      roleName: typeof role === 'object' ? (role as Role).name : '',
      hours: doc.hours,
      rate: doc.rate ?? null,
      description: doc.description ?? null,
      skills: (e.skills ?? []).map(s => s.skill),
      sectorExperience: (e.sectorExperience ?? []).map(s => s.sector),
    }
  }

  const directAssignments: TeamMember[] = directAssignmentDocs.map(toTeamMember).filter((m): m is TeamMember => m !== null)

  // Child assignments (phases only)
  type ChildMember = { viaName: string } & TeamMember
  let childAssignments: ChildMember[] = []

  if (type === 'phase') {
    const phase = workItemResult as ProjectPhase
    const taskItems = (phase.tasks ?? [])
      .map(t => t as string | Task)
      .filter((t): t is Task => typeof t === 'object')
      .map(t => ({ id: t.id, name: t.name }))

    if (taskItems.length > 0) {
      const { docs: childDocs } = await payload.find({
        collection: 'assignments',
        where: {
          and: [
            { 'workItem.relationTo': { equals: 'tasks' } },
            { 'workItem.value': { in: taskItems.map(t => t.id) } },
          ],
        },
        depth: 1,
        limit: 1000,
        overrideAccess: true,
      })

      const taskNameById: Record<string, string> = {}
      for (const t of taskItems) taskNameById[t.id] = t.name

      childAssignments = childDocs.flatMap(doc => {
        const member = toTeamMember(doc)
        if (!member) return []
        const taskId = resolveId(doc.workItem.value as string | Task)
        return [{ ...member, viaName: taskNameById[taskId] ?? 'Unknown task' }]
      })
    }
  }

  const dismissedSuggestions: string[] = type === 'task'
    ? ((workItemResult as Task).dismissedSuggestions ?? []).map(d => d.key)
    : []

  const itemData = type === 'phase'
    ? (() => {
        const ph = workItemResult as ProjectPhase
        return {
          id: ph.id, name: ph.name,
          startDate: ph.startDate, endDate: ph.endDate,
          status: deriveStatus(ph.startDate, ph.endDate),
          requiredSkills: (ph.requiredSkills ?? []).map(s => s.skill),
          completed: undefined, dismissedSuggestions: [],
        }
      })()
    : (() => {
        const t = workItemResult as Task
        return {
          id: t.id, name: t.name,
          startDate: t.startDate, endDate: t.endDate,
          status: deriveStatus(t.startDate, t.endDate, t.completed),
          requiredSkills: (t.requiredSkills ?? []).map(s => s.skill),
          completed: t.completed ?? false,
          dismissedSuggestions,
        }
      })()

  return NextResponse.json({
    type,
    isInternal: isInternalTask,
    item: itemData,
    project: project
      ? { id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate }
      : null,
    category: category ? { id: category.id, name: category.name } : null,
    projectSectorName,
    ganttBars,
    directAssignments,
    childAssignments,
  })
}
