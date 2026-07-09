import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Assignment, Employee, Project, ProjectPhase, Role, Sector, Task } from '@/payload-types'
import ProjectGantt from '@/components/ProjectGantt/ProjectGantt'
import PhaseList from '@/components/PhaseList/PhaseList'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import { formatDateRange, deriveStatus } from '@/lib/dateUtils'
import { rollingUtilizationPct, type AssignmentForUtil } from '@/lib/utilization'
import styles from './page.module.scss'

type Params = { id: string }

function resolveId(val: string | { id: string }): string {
  return typeof val === 'string' ? val : val.id
}

export default async function ProjectDetailPage(props: { params: Promise<Params> }) {
  const { id } = await props.params
  const payload = await getPayload({ config: await config })

  const project = await payload.findByID({
    collection: 'projects',
    id,
    depth: 1,
    overrideAccess: true,
  }).catch(() => null)

  if (!project) notFound()

  const phaseIds = (project.phases ?? []).map(p => resolveId(p as string | ProjectPhase))

  const [{ docs: phases }, { docs: projectAssignments }, { docs: phaseAssignments }] = await Promise.all([
    phaseIds.length > 0
      ? payload.find({
          collection: 'project-phases',
          where: { id: { in: phaseIds } },
          depth: 1,
          limit: 100,
          overrideAccess: true,
        })
      : Promise.resolve({ docs: [] as ProjectPhase[] }),
    payload.find({
      collection: 'assignments',
      where: {
        and: [
          { 'workItem.relationTo': { equals: 'projects' } },
          { 'workItem.value': { equals: id } },
        ],
      },
      depth: 1,
      limit: 1000,
      overrideAccess: true,
    }),
    phaseIds.length > 0
      ? payload.find({
          collection: 'assignments',
          where: {
            and: [
              { 'workItem.relationTo': { equals: 'project-phases' } },
              { 'workItem.value': { in: phaseIds } },
            ],
          },
          depth: 1,
          limit: 1000,
          overrideAccess: true,
        })
      : Promise.resolve({ docs: [] as Assignment[] }),
  ])

  // Collect all task IDs and fetch task-level assignments
  const taskIds = phases.flatMap(ph =>
    (ph.tasks ?? []).map(t => resolveId(t as string | Task))
  )

  const { docs: taskAssignments } = taskIds.length > 0
    ? await payload.find({
        collection: 'assignments',
        where: {
          and: [
            { 'workItem.relationTo': { equals: 'tasks' } },
            { 'workItem.value': { in: taskIds } },
          ],
        },
        depth: 1,
        limit: 1000,
        overrideAccess: true,
      })
    : { docs: [] as Assignment[] }

  const allProjectAssignments = [...projectAssignments, ...phaseAssignments, ...taskAssignments]

  // Build assignment lookups by workItem id
  const assignmentsByWorkItem: Record<string, Assignment[]> = {}
  for (const a of allProjectAssignments) {
    const wid = resolveId(a.workItem.value as string | Project | ProjectPhase | Task)
    if (!assignmentsByWorkItem[wid]) assignmentsByWorkItem[wid] = []
    assignmentsByWorkItem[wid].push(a)
  }

  // Build gantt bars: phases first, then tasks nested under each phase
  type GanttBar = {
    id: string
    label: string
    type: 'phase' | 'task'
    status: 'upcoming' | 'active' | 'complete'
    startDate: string
    endDate: string
  }

  const ganttBars: GanttBar[] = []
  const sortedPhases = phaseIds
    .map(pid => phases.find(p => p.id === pid))
    .filter((p): p is ProjectPhase => Boolean(p))

  for (const phase of sortedPhases) {
    ganttBars.push({
      id: phase.id,
      label: phase.name,
      type: 'phase',
      status: deriveStatus(phase.startDate, phase.endDate),
      startDate: phase.startDate,
      endDate: phase.endDate,
    })
    const phaseTasks = (phase.tasks ?? [])
      .map(t => t as string | Task)
      .filter((t): t is Task => typeof t === 'object')
    for (const task of phaseTasks) {
      ganttBars.push({
        id: task.id,
        label: task.name,
        type: 'task',
        status: deriveStatus(task.startDate, task.endDate, task.completed),
        startDate: task.startDate,
        endDate: task.endDate,
      })
    }
  }

  // Build PhaseList data
  function avatarsForItem(itemId: string) {
    return (assignmentsByWorkItem[itemId] ?? [])
      .map(a => a.employee)
      .filter((e): e is Employee => typeof e === 'object')
      .map(e => ({ id: e.id, name: e.name, color: e.color ?? null }))
  }

  const phaseListData = sortedPhases.map(phase => {
    const phaseTasks = (phase.tasks ?? [])
      .map(t => t as string | Task)
      .filter((t): t is Task => typeof t === 'object')

    return {
      id: phase.id,
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
      status: deriveStatus(phase.startDate, phase.endDate) as 'upcoming' | 'active' | 'complete',
      requiredSkills: (phase.requiredSkills ?? []).map(s => s.skill),
      avatars: avatarsForItem(phase.id),
      tasks: phaseTasks.map(task => ({
        id: task.id,
        name: task.name,
        startDate: task.startDate,
        endDate: task.endDate,
        status: deriveStatus(task.startDate, task.endDate, task.completed) as 'upcoming' | 'active' | 'complete',
        requiredSkills: (task.requiredSkills ?? []).map(s => s.skill),
        avatars: avatarsForItem(task.id),
      })),
    }
  })

  // Build "Team on This Project" — unique employees across all assignments
  type TeamEntry = {
    id: string
    name: string
    color: string | null
    roles: string[]
    totalHours: number
    capacity: number
  }
  const teamMap: Record<string, TeamEntry> = {}
  for (const assignment of allProjectAssignments) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const role = assignment.role
    const roleName = typeof role === 'object' ? (role as Role).name : ''
    if (!teamMap[emp.id]) {
      teamMap[emp.id] = {
        id: emp.id,
        name: emp.name,
        color: emp.color ?? null,
        roles: [],
        totalHours: 0,
        capacity: emp.maximumHours ?? 40,
      }
    }
    teamMap[emp.id].totalHours += assignment.hours
    if (roleName && !teamMap[emp.id].roles.includes(roleName)) {
      teamMap[emp.id].roles.push(roleName)
    }
  }
  const team = Object.values(teamMap)

  // Fetch all assignments for team members (globally) to compute accurate utilization
  const teamIds = team.map(m => m.id)
  const { docs: allTeamAssignments } = teamIds.length > 0
    ? await payload.find({
        collection: 'assignments',
        where: { employee: { in: teamIds } },
        depth: 1,
        limit: 10000,
        overrideAccess: true,
      })
    : { docs: [] as Assignment[] }

  // Build per-employee AssignmentForUtil from their global assignments
  const empAllAssignments: Record<string, AssignmentForUtil[]> = {}
  for (const assignment of allTeamAssignments) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue
    const wItem = wv as { startDate?: string; endDate?: string }
    if (!wItem.startDate || !wItem.endDate) continue
    if (!empAllAssignments[emp.id]) empAllAssignments[emp.id] = []
    empAllAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
  }

  const today = new Date()

  const sectorName = project.sector && typeof project.sector === 'object'
    ? (project.sector as Sector).name
    : null

  return (
    <div className={styles.root}>
      <Link href="/projects" className={styles.backLink}>‹ ALL PROJECTS</Link>
      <div className={styles.pageHeader}>
        <h2 className={styles.projectName}>{project.name}</h2>
        <div className={styles.headerMeta}>
          {sectorName && <span className={styles.sectorBadge}>{sectorName}</span>}
          <span className={styles.dateRange}>{formatDateRange(project.startDate, project.endDate)}</span>
          {project.budget != null && (
            <span className={styles.budget}>${project.budget.toLocaleString('en-US')}</span>
          )}
        </div>
      </div>

      {ganttBars.length > 0 && (
        <ProjectGantt
          projectStartDate={project.startDate}
          projectEndDate={project.endDate}
          bars={ganttBars}
        />
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Phases &amp; Tasks</h3>
        {phaseListData.length > 0
          ? <PhaseList phases={phaseListData} projectId={id} />
          : <p className={styles.empty}>No phases yet.</p>
        }
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Team on This Project</h3>
        {team.length > 0 ? (
          <div className={styles.team}>
            {team.map(member => (
              <div key={member.id} className={styles.teamRow}>
                <UtilizationRing
                  size="sm"
                  pct={rollingUtilizationPct(empAllAssignments[member.id] ?? [], member.capacity, 4, today)}
                  name={member.name}
                  avatarColor={member.color ?? '#9a9484'}
                  windowWeeks={4}
                />
                <div className={styles.teamInfo}>
                  <div className={styles.teamName}>{member.name}</div>
                  <div className={styles.teamRoles}>{member.roles.join(', ')}</div>
                </div>
                <span className={styles.teamHours}>{member.totalHours} hrs</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No one assigned yet.</p>
        )}
      </section>
    </div>
  )
}
