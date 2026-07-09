import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, Project, ProjectPhase, Role, Sector, Task } from '@/payload-types'
import { rollingUtilizationPct } from '@/lib/utilization'

export async function GET(req: NextRequest) {
  const workItemId = req.nextUrl.searchParams.get('workItemId')
  const workItemType = req.nextUrl.searchParams.get('workItemType') as 'phase' | 'task' | null
  const projectId = req.nextUrl.searchParams.get('projectId')

  if (!workItemId || !workItemType || !projectId) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const payload = await getPayload({ config: await config })

  const [project, workItem, { docs: employees }, { docs: allAssignments }, { docs: roles }] = await Promise.all([
    payload.findByID({ collection: 'projects', id: projectId, depth: 1, overrideAccess: true }).catch(() => null),
    workItemType === 'phase'
      ? payload.findByID({ collection: 'project-phases', id: workItemId, depth: 0, overrideAccess: true }).catch(() => null)
      : payload.findByID({ collection: 'tasks', id: workItemId, depth: 0, overrideAccess: true }).catch(() => null),
    payload.find({ collection: 'employees', limit: 200, overrideAccess: true }),
    payload.find({ collection: 'assignments', depth: 1, limit: 10000, overrideAccess: true }),
    payload.find({ collection: 'roles', limit: 100, overrideAccess: true }),
  ])

  if (!project || !workItem) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const proj = project as Project
  const sectorName = proj.sector && typeof proj.sector === 'object'
    ? (proj.sector as Sector).name
    : null

  const wi = workItem as ProjectPhase | Task
  const requiredSkills = (wi.requiredSkills ?? []).map((s: { skill: string }) => s.skill)

  // Build set of all work item IDs belonging to this project (for rate lookup)
  const phaseIds = (proj.phases ?? []).map(
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
  const projectWorkItemIds = new Set([projectId, ...phaseIds, ...taskIds])

  // Build per-employee assignment map (for utilization) and per-employee project rate
  const empAssignments: Record<string, { hours: number; startDate: string; endDate: string }[]> = {}
  const empProjectRates: Record<string, number> = {}

  for (const assignment of allAssignments) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue

    const wItem = wv as { id?: string; startDate?: string; endDate?: string }

    if (wItem.startDate && wItem.endDate) {
      if (!empAssignments[emp.id]) empAssignments[emp.id] = []
      empAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
    }

    // Track the first rate found for this employee on any of the project's work items
    if (wItem.id && projectWorkItemIds.has(wItem.id) && assignment.rate != null && empProjectRates[emp.id] == null) {
      empProjectRates[emp.id] = assignment.rate
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
      baseHourlyRate: emp.baseHourlyRate ?? 150,
      availabilityPct,
      sectorMatch,
      skillsMatch,
      skillsTotal: requiredSkills.length,
      assignmentsForUtil: empAssignments[emp.id] ?? [],
    }
  })

  const collectionSlug = workItemType === 'phase' ? 'project-phases' : 'tasks'
  const roleList = roles
    .filter((r: Role) => {
      const allowed = r.allowedOn ?? ['projects', 'project-phases', 'tasks']
      return allowed.includes(collectionSlug as 'projects' | 'project-phases' | 'tasks')
    })
    .map((r: Role) => ({ id: r.id, name: r.name }))

  return NextResponse.json({
    requiredSkills,
    projectSectorName: sectorName,
    candidates,
    empProjectRates,
    roles: roleList,
  })
}
