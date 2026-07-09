'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ProjectGantt from '@/components/ProjectGantt/ProjectGantt'
import EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import AssignmentFlow from '@/components/AssignmentFlow/AssignmentFlow'
import { useDrawer } from '@/context/DrawerContext'
import { formatDateRange } from '@/lib/dateUtils'
import styles from './WorkItemDetail.module.scss'

type WorkItemDetailProps = {
  workItemId: string
  workItemType: 'phase' | 'task'
}

type GanttBar = {
  id: string; label: string; type: 'phase' | 'task'
  status: 'upcoming' | 'active' | 'complete'; startDate: string; endDate: string
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

type ChildMember = { viaName: string } & TeamMember

type DetailData = {
  type: 'phase' | 'task'
  isInternal: boolean
  item: {
    id: string; name: string; startDate: string; endDate: string
    status: 'upcoming' | 'active' | 'complete'; requiredSkills: string[]
    completed?: boolean; dismissedSuggestions: string[]
  }
  project: { id: string; name: string; startDate: string; endDate: string } | null
  category: { id: string; name: string } | null
  projectSectorName: string | null
  ganttBars: GanttBar[]
  directAssignments: TeamMember[]
  childAssignments: ChildMember[]
}

type Suggestion = {
  key: string
  employeeId: string
  employeeName: string
  type: 'skill' | 'sector'
  value: string
}

const STATUS_LABELS = { upcoming: 'To Do', active: 'In Progress', complete: 'Complete' }
const STATUS_COLORS = { upcoming: '#9a9484', active: '#2c4a6e', complete: '#4a7c59' }

function buildSuggestions(
  item: DetailData['item'],
  directAssignments: TeamMember[],
  projectSectorName: string | null,
): Suggestion[] {
  if (!item.completed) return []
  const suggestions: Suggestion[] = []
  for (const member of directAssignments) {
    for (const skill of item.requiredSkills) {
      if (!member.skills.includes(skill)) {
        const key = `${member.employeeId}:skill:${skill}`
        if (!item.dismissedSuggestions.includes(key)) {
          suggestions.push({ key, employeeId: member.employeeId, employeeName: member.employeeName, type: 'skill', value: skill })
        }
      }
    }
    if (projectSectorName && !member.sectorExperience.includes(projectSectorName)) {
      const key = `${member.employeeId}:sector:${projectSectorName}`
      if (!item.dismissedSuggestions.includes(key)) {
        suggestions.push({ key, employeeId: member.employeeId, employeeName: member.employeeName, type: 'sector', value: projectSectorName })
      }
    }
  }
  return suggestions
}

export default function WorkItemDetail(props: WorkItemDetailProps) {
  const { setDrawer } = useDrawer()
  const [data, setData] = useState<DetailData | null>(null)
  const [flowMode, setFlowMode] = useState<'add' | TeamMember | null>(null)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(() => {
    setData(null)
    fetch(`/api/work-item/${props.workItemId}?type=${props.workItemType}`)
      .then(r => r.json())
      .then(setData)
  }, [props.workItemId, props.workItemType])

  useEffect(() => { load() }, [load])

  function openEmployee(employeeId: string) {
    setDrawer({ component: EmployeeDetail, componentProps: { employeeId } })
  }

  async function removeAssignment(assignmentId: string) {
    await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' })
    load()
  }

  async function toggleComplete() {
    if (!data) return
    setToggling(true)
    await fetch(`/api/tasks/${props.workItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !data.item.completed }),
    })
    setToggling(false)
    load()
  }

  async function addToProfile(suggestion: Suggestion) {
    const body = suggestion.type === 'skill'
      ? { addSkill: suggestion.value }
      : { addSector: suggestion.value }
    await fetch(`/api/employee-profile/${suggestion.employeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await dismissSuggestion(suggestion.key)
  }

  async function dismissSuggestion(key: string) {
    if (!data) return
    const merged = Array.from(new Set([...data.item.dismissedSuggestions, key])).map(k => ({ key: k }))
    await fetch(`/api/tasks/${props.workItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissedSuggestions: merged }),
    })
    load()
  }

  if (flowMode !== null && data) {
    const editing = typeof flowMode === 'object' ? flowMode : null
    return (
      <AssignmentFlow
        workItemId={props.workItemId}
        workItemType={props.workItemType}
        workItemStartDate={data.item.startDate}
        workItemEndDate={data.item.endDate}
        projectId={data.project?.id ?? null}
        isInternal={data.isInternal}
        categoryId={data.category?.id ?? null}
        editingAssignment={editing ? {
          assignmentId: editing.assignmentId,
          employeeId: editing.employeeId,
          employeeName: editing.employeeName,
          employeeColor: editing.employeeColor,
          jobTitle: null,
          roleId: editing.roleId,
          hours: String(editing.hours),
          description: editing.description ?? '',
          rate: editing.rate != null ? String(editing.rate) : '',
        } : undefined}
        onClose={() => setFlowMode(null)}
        onSave={() => { setFlowMode(null); load() }}
      />
    )
  }

  if (!data) {
    return <div className={styles.loading}>Loading…</div>
  }

  const { type, isInternal, item, project, category, projectSectorName, ganttBars, directAssignments, childAssignments } = data
  const suggestions = buildSuggestions(item, directAssignments, projectSectorName)

  return (
    <div className={styles.root}>
      <div className={styles.badges}>
        {isInternal && <span className={styles.internalBadge}>INTERNAL TASK</span>}
        <span className={styles.typeBadge} data-internal={isInternal ? 'true' : undefined}>{type.toUpperCase()}</span>
        <span className={styles.statusBadge} style={{ color: STATUS_COLORS[item.status] }}>
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {isInternal && category ? (
        <span className={styles.categoryLabel}>{category.name}</span>
      ) : project ? (
        <Link href={`/projects/${project.id}`} className={styles.projectLink}>
          {project.name}
        </Link>
      ) : null}

      <h2 className={styles.name}>{item.name}</h2>
      <div className={styles.dateRange}>{formatDateRange(item.startDate, item.endDate)}</div>

      {item.requiredSkills.length > 0 && (
        <div className={styles.skills}>
          {item.requiredSkills.map(skill => (
            <span key={skill} className={styles.skillTag}>{skill}</span>
          ))}
        </div>
      )}

      {!isInternal && project && ganttBars.length > 0 && (
        <div className={styles.miniGantt}>
          <ProjectGantt
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
            bars={ganttBars}
            highlightId={item.id}
            compact={true}
          />
        </div>
      )}

      {(directAssignments.length > 0 || childAssignments.length > 0) && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>TEAM</div>
          {directAssignments.map(member => (
            <div key={member.assignmentId} className={styles.teamRow}>
              <button
                type="button"
                className={styles.empName}
                onClick={() => openEmployee(member.employeeId)}
                style={{ background: member.employeeColor ?? '#9a9484' }}
              >
                {member.employeeName}
              </button>
              <div className={styles.memberInfo}>
                {member.roleName && <span className={styles.memberRole}>{member.roleName}</span>}
                {member.description && <span className={styles.memberDesc}>{member.description}</span>}
              </div>
              <div className={styles.memberRight}>
                <span className={styles.memberHours}>{member.hours}h</span>
                <div className={styles.memberActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setFlowMode(member)}
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    data-destructive="true"
                    onClick={() => removeAssignment(member.assignmentId)}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </div>
          ))}
          {childAssignments.map(member => (
            <div key={`child-${member.assignmentId}`} className={styles.teamRow} data-child="true">
              <button
                type="button"
                className={styles.empName}
                onClick={() => openEmployee(member.employeeId)}
                style={{ background: member.employeeColor ?? '#9a9484' }}
              >
                {member.employeeName}
              </button>
              <div className={styles.memberInfo}>
                {member.roleName && <span className={styles.memberRole}>{member.roleName}</span>}
                <span className={styles.viaLabel}>via {member.viaName}</span>
              </div>
              <div className={styles.memberRight}>
                <span className={styles.memberHours}>{member.hours}h</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>PROFILE SUGGESTIONS</div>
          {suggestions.map(s => (
            <div key={s.key} className={styles.suggestion}>
              <span className={styles.suggestionText}>
                <strong>{s.employeeName}</strong> doesn&apos;t have {s.type === 'skill' ? 'skill' : 'sector experience'} &ldquo;{s.value}&rdquo; — add it to their profile?
              </span>
              <div className={styles.suggestionActions}>
                <button type="button" className={styles.suggestionAdd} onClick={() => addToProfile(s)}>ADD</button>
                <button type="button" className={styles.suggestionDismiss} onClick={() => dismissSuggestion(s.key)}>DISMISS</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.assignBtn} onClick={() => setFlowMode('add')}>
          + ASSIGN EMPLOYEE
        </button>
        {type === 'task' && (
          <button
            type="button"
            className={styles.completeBtn}
            onClick={toggleComplete}
            disabled={toggling}
            data-complete={item.completed ? 'true' : undefined}
          >
            {toggling ? '…' : item.completed ? 'REOPEN TASK' : 'MARK COMPLETE'}
          </button>
        )}
      </div>
    </div>
  )
}
