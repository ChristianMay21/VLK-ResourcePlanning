import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Assignment, Employee, Project, ProjectPhase, Sector, Task } from '@/payload-types'
import ProjectCard from '@/components/ProjectCard/ProjectCard'
import { formatDateRange } from '@/lib/dateUtils'
import { rollingUtilizationPct, type AssignmentForUtil } from '@/lib/utilization'
import styles from './ProjectList.module.scss'

type EmployeeChip = {
  id: string
  name: string
  color: string | null
  totalHours: number
  utilPct: number
}

function resolveId(val: string | { id: string }): string {
  return typeof val === 'string' ? val : val.id
}

export default async function ProjectList() {
  const payload = await getPayload({ config: await config })

  const [{ docs: projects }, { docs: phases }, { docs: assignments }] = await Promise.all([
    payload.find({ collection: 'projects', depth: 1, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'project-phases', depth: 1, limit: 1000, overrideAccess: true }),
    payload.find({ collection: 'assignments', depth: 1, limit: 10000, overrideAccess: true }),
  ])

  // Build phaseId → projectId lookup from the phases on each project
  const phaseToProject: Record<string, string> = {}
  for (const project of projects) {
    for (const phase of (project.phases ?? [])) {
      phaseToProject[resolveId(phase as string | ProjectPhase)] = project.id
    }
  }

  // Build taskId → projectId lookup via phases
  const taskToProject: Record<string, string> = {}
  for (const phase of phases) {
    const projectId = phaseToProject[phase.id]
    if (!projectId) continue
    for (const task of (phase.tasks ?? [])) {
      taskToProject[resolveId(task as string | Task)] = projectId
    }
  }

  // Build per-employee global assignment list (for utilization) and capacity
  const empAllAssignments: Record<string, AssignmentForUtil[]> = {}
  const empCapacity: Record<string, number> = {}

  for (const assignment of assignments) {
    const employee = assignment.employee
    if (typeof employee !== 'object') continue
    const emp = employee as Employee
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue
    const wItem = wv as { startDate?: string; endDate?: string }
    if (!wItem.startDate || !wItem.endDate) continue

    if (!empAllAssignments[emp.id]) {
      empAllAssignments[emp.id] = []
      empCapacity[emp.id] = emp.maximumHours ?? 40
    }
    empAllAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
  }

  // Aggregate assignment hours per project, per employee
  type AggEntry = { name: string; color: string | null; hours: number }
  const byProject: Record<string, Record<string, AggEntry>> = {}

  for (const assignment of assignments) {
    let projectId: string | null = null

    if (assignment.workItem.relationTo === 'projects') {
      projectId = resolveId(assignment.workItem.value as string | Project)
    } else if (assignment.workItem.relationTo === 'project-phases') {
      const phaseId = resolveId(assignment.workItem.value as string | ProjectPhase)
      projectId = phaseToProject[phaseId] ?? null
    } else if (assignment.workItem.relationTo === 'tasks') {
      const taskId = resolveId(assignment.workItem.value as string | Task)
      projectId = taskToProject[taskId] ?? null
    }

    if (!projectId) continue

    const employee = assignment.employee as Employee
    if (typeof employee === 'string') continue

    if (!byProject[projectId]) byProject[projectId] = {}
    const existing = byProject[projectId][employee.id]
    if (existing) {
      existing.hours += assignment.hours
    } else {
      byProject[projectId][employee.id] = {
        name: employee.name,
        color: employee.color ?? null,
        hours: assignment.hours,
      }
    }
  }

  const today = new Date()

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <span className={styles.count}>{projects.length} {projects.length === 1 ? 'PROJECT' : 'PROJECTS'}</span>
      </div>
      <div className={styles.list}>
        {projects.map(project => {
          const empMap = byProject[project.id] ?? {}
          const chips: EmployeeChip[] = Object.entries(empMap).map(([id, e]) => ({
            id,
            name: e.name,
            color: e.color,
            totalHours: e.hours,
            utilPct: rollingUtilizationPct(empAllAssignments[id] ?? [], empCapacity[id] ?? 40, 4, today),
          }))
          const totalHours = chips.reduce((sum, c) => sum + c.totalHours, 0)
          const sectorName = project.sector && typeof project.sector === 'object'
            ? (project.sector as Sector).name
            : null

          return (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              sectorName={sectorName}
              dateRange={formatDateRange(project.startDate, project.endDate)}
              phaseCount={(project.phases ?? []).length}
              teamSize={chips.length}
              totalHours={totalHours}
              budget={project.budget ?? null}
              employeeChips={chips}
            />
          )
        })}
      </div>
    </div>
  )
}
