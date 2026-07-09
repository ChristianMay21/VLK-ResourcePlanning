import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Assignment, Employee, Project, ProjectPhase, Role, Sector, Task } from '@/payload-types'
import { rollingUtilizationPct } from '@/lib/utilization'

export async function GET(req: NextRequest) {
  const workItemId = req.nextUrl.searchParams.get('workItemId')
  const workItemType = req.nextUrl.searchParams.get('workItemType') as 'phase' | 'task' | null
  const projectId = req.nextUrl.searchParams.get('projectId')
  const categoryId = req.nextUrl.searchParams.get('categoryId')

  if (!workItemId || !workItemType) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const isInternal = !projectId && !!categoryId

  const payload = await getPayload({ config: await config })

  const [workItem, { docs: employees }, { docs: allAssignments }, { docs: roles }] = await Promise.all([
    workItemType === 'phase'
      ? payload.findByID({ collection: 'project-phases', id: workItemId, depth: 0, overrideAccess: true }).catch(() => null)
      : payload.findByID({ collection: 'tasks', id: workItemId, depth: 0, overrideAccess: true }).catch(() => null),
    payload.find({ collection: 'employees', limit: 200, overrideAccess: true }),
    payload.find({ collection: 'assignments', depth: 1, limit: 10000, overrideAccess: true }),
    payload.find({ collection: 'roles', limit: 100, overrideAccess: true }),
  ])

  if (!workItem) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // For project tasks/phases: fetch project for sector and build project work item ID set
  let sectorName: string | null = null
  const projectWorkItemIds = new Set<string>()

  if (!isInternal && projectId) {
    const project = await payload.findByID({
      collection: 'projects', id: projectId, depth: 1, overrideAccess: true,
    }).catch(() => null) as Project | null

    if (project) {
      sectorName = project.sector && typeof project.sector === 'object'
        ? (project.sector as Sector).name
        : null

      const phaseIds = (project.phases ?? []).map(
        (p: string | { id: string }) => (typeof p === 'string' ? p : p.id),
      )
      const { docs: projectTasks } = phaseIds.length > 0
        ? await payload.find({
            collection: 'tasks',
            where: { phase: { in: phaseIds } },
            limit: 10000,
            overrideAccess: true,
          })
        : { docs: [] }
      const taskIds = projectTasks.map((t: { id: string }) => t.id)
      ;[projectId, ...phaseIds, ...taskIds].forEach(id => projectWorkItemIds.add(id))
    }
  }

  const wi = workItem as ProjectPhase | Task
  const requiredSkills = (wi.requiredSkills ?? []).map((s: { skill: string }) => s.skill)

  // Build per-employee util data and project rate map
  const empAssignments: Record<string, { hours: number; startDate: string; endDate: string }[]> = {}
  const empProjectRates: Record<string, number> = {}

  // Budget cost tracking — cost = hours × rate for each assignment
  let projectExistingCost = 0
  let workItemExistingCost = 0

  for (const assignment of allAssignments as Assignment[]) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue

    const wItem = wv as { id?: string; startDate?: string; endDate?: string }

    if (wItem.startDate && wItem.endDate) {
      if (!empAssignments[emp.id]) empAssignments[emp.id] = []
      empAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
    }

    if (!isInternal && wItem.id && projectWorkItemIds.has(wItem.id)) {
      if (assignment.rate != null && empProjectRates[emp.id] == null) {
        empProjectRates[emp.id] = assignment.rate
      }
      const cost = assignment.rate != null ? assignment.hours * assignment.rate : 0
      projectExistingCost += cost
      if (wItem.id === workItemId) workItemExistingCost += cost
    }
  }

  const today = new Date()

  const candidates = employees.map((emp: Employee) => {
    const availabilityPct = rollingUtilizationPct(empAssignments[emp.id] ?? [], emp.maximumHours ?? 40, 4, today)
    const empSectors = (emp.sectorExperience ?? []).map((s: { sector: string }) => s.sector)
    const empSkills = (emp.skills ?? []).map((s: { skill: string }) => s.skill)

    const sectorMatch = sectorName !== null && empSectors.includes(sectorName)
    const skillsMatch = requiredSkills.filter(s => empSkills.includes(s)).length

    return {
      id: emp.id,
      name: emp.name,
      color: emp.color ?? null,
      jobTitle: emp.jobTitle ?? null,
      weeklyCapacity: emp.maximumHours ?? 40,
      baseHourlyRate: emp.baseHourlyRate ?? null,
      availabilityPct,
      sectorMatch,
      skillsMatch,
      skillsTotal: requiredSkills.length,
      assignmentsForUtil: empAssignments[emp.id] ?? [],
    }
  })

  // Filter roles by allowedOn
  const roleList = roles
    .filter((r: Role) => {
      const allowed = r.allowedOn ?? ['projects', 'project-phases', 'tasks', 'internal']
      if (isInternal) return allowed.includes('internal')
      const collectionSlug = workItemType === 'phase' ? 'project-phases' : 'tasks'
      return allowed.includes(collectionSlug as 'projects' | 'project-phases' | 'tasks')
    })
    .map((r: Role) => ({ id: r.id, name: r.name }))

  // Budget data for the impact panel (project assignments only)
  let budgetData: {
    projectBudget: number | null
    projectName: string
    projectExistingCost: number
    workItemBudget: number | null
    workItemExistingCost: number
    workItemName: string
  } | null = null

  if (!isInternal && projectId) {
    const proj = await payload.findByID({
      collection: 'projects', id: projectId, depth: 0, overrideAccess: true,
    }).catch(() => null) as Project | null

    if (proj) {
      let workItemBudget: number | null = null
      let workItemName = ''
      if (workItemType === 'phase') {
        const ph = workItem as ProjectPhase
        workItemBudget = (ph as ProjectPhase & { budgetAllocation?: number | null }).budgetAllocation ?? null
        workItemName = ph.name
      } else {
        const t = workItem as Task
        workItemName = t.name
      }

      budgetData = {
        projectBudget: proj.budget ?? null,
        projectName: proj.name,
        projectExistingCost,
        workItemBudget,
        workItemExistingCost,
        workItemName,
      }
    }
  }

  return NextResponse.json({
    requiredSkills,
    projectSectorName: sectorName,
    isInternal,
    candidates,
    empProjectRates,
    roles: roleList,
    budgetData,
  })
}
