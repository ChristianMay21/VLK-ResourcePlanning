import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, InternalWorkCategory, Project, ProjectPhase, Task } from '@/payload-types'
import EmployeeGrid from '@/components/EmployeeGrid/EmployeeGrid'
import type { TimelineEntry } from '@/components/TeamTimeline/TeamTimeline'
import type { AssignmentForUtil } from '@/lib/utilization'

type EmployeeGridData = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  capacity: number
  baseHourlyRate: number | null
  assignments: AssignmentForUtil[]
}

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const payload = await getPayload({ config: await config })

  const [{ docs: employees }, { docs: allAssignments }, { docs: allProjects }, { docs: allCategories }] =
    await Promise.all([
      payload.find({ collection: 'employees', limit: 200, sort: 'name', overrideAccess: true }),
      payload.find({ collection: 'assignments', depth: 1, limit: 10000, overrideAccess: true }),
      payload.find({ collection: 'projects', depth: 1, limit: 200, overrideAccess: true }),
      payload.find({ collection: 'internal-work-categories', limit: 200, overrideAccess: true }),
    ])

  // Build phase → project name lookup
  const phaseToProjectName: Record<string, string> = {}
  for (const project of allProjects as Project[]) {
    for (const phase of (project.phases ?? [])) {
      const phaseId = typeof phase === 'string' ? phase : (phase as ProjectPhase).id
      phaseToProjectName[phaseId] = project.name
    }
  }

  // Build category id → name lookup
  const categoryNameById: Record<string, string> = {}
  for (const cat of allCategories as InternalWorkCategory[]) {
    categoryNameById[cat.id] = cat.name
  }

  const empAssignments: Record<string, AssignmentForUtil[]> = {}
  const timelineEntries: TimelineEntry[] = []

  for (const assignment of allAssignments) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue
    const wItem = wv as { id: string; name: string; startDate?: string; endDate?: string; phase?: unknown; category?: unknown }
    if (!wItem.startDate || !wItem.endDate) continue

    // Utilization (existing — no isInternal distinction needed here yet)
    if (!empAssignments[emp.id]) empAssignments[emp.id] = []
    empAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })

    // Timeline entry
    let isInternal = false
    let itemName = wItem.name ?? ''
    let contextName = ''

    if (assignment.workItem.relationTo === 'tasks') {
      const task = wv as Task
      const catVal = task.category
      if (catVal != null) {
        isInternal = true
        const catId = typeof catVal === 'string' ? catVal : (catVal as InternalWorkCategory).id
        contextName = categoryNameById[catId] ?? ''
      } else {
        // Billable task — get project via phase
        const phaseVal = task.phase
        if (phaseVal != null) {
          const phaseId = typeof phaseVal === 'string' ? phaseVal : (phaseVal as ProjectPhase).id
          contextName = phaseToProjectName[phaseId] ?? ''
        }
      }
    } else if (assignment.workItem.relationTo === 'project-phases') {
      contextName = phaseToProjectName[wItem.id] ?? ''
    }
    // project-level assignments: item IS the project, no extra context needed

    timelineEntries.push({
      employeeId: emp.id,
      hours: assignment.hours,
      startDate: wItem.startDate,
      endDate: wItem.endDate,
      isInternal,
      itemName,
      contextName,
    })
  }

  const employeeData: EmployeeGridData[] = employees.map((emp: Employee) => ({
    id: emp.id,
    name: emp.name,
    color: emp.color ?? null,
    jobTitle: emp.jobTitle ?? null,
    capacity: emp.maximumHours ?? 40,
    baseHourlyRate: emp.baseHourlyRate ?? null,
    assignments: empAssignments[emp.id] ?? [],
  }))

  return <EmployeeGrid employees={employeeData} timelineEntries={timelineEntries} />
}
