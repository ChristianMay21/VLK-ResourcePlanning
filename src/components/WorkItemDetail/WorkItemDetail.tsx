'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectGantt from '@/components/ProjectGantt/ProjectGantt'
import EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import AssignmentFlow from '@/components/AssignmentFlow/AssignmentFlow'
import { useDrawer } from '@/context/DrawerContext'
import { formatDateRange } from '@/lib/dateUtils'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import styles from './WorkItemDetail.module.scss'

type WorkItemDetailProps = {
  workItemId: string
  workItemType: 'phase' | 'task'
  openAssign?: boolean
  onAssignmentChange?: () => void
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
  parentPhase: { id: string; startDate: string; endDate: string } | null
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
  const router = useRouter()
  const [data, setData] = useState<DetailData | null>(null)
  const [flowMode, setFlowMode] = useState<'add' | TeamMember | null>(props.openAssign ? 'add' : null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    props.onAssignmentChange?.()
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

  function openEdit() {
    if (!data) return
    setEditName(data.item.name)
    setEditStart(data.item.startDate.slice(0, 10))
    setEditEnd(data.item.endDate.slice(0, 10))
    setEditError(null)
    setEditMode(true)
  }

  async function saveEdit() {
    if (!data || !editName.trim() || !editStart || !editEnd) return

    if (data.type === 'phase') {
      const projectStart = data.project?.startDate?.slice(0, 10)
      const projectEnd = data.project?.endDate?.slice(0, 10)
      if (projectStart && editStart < projectStart) {
        setEditError(`Start date cannot be before project start (${projectStart})`)
        return
      }
      if (projectEnd && editEnd > projectEnd) {
        setEditError(`End date cannot be after project end (${projectEnd})`)
        return
      }
    } else {
      const phaseStart = data.parentPhase?.startDate?.slice(0, 10)
      const phaseEnd = data.parentPhase?.endDate?.slice(0, 10)
      if (phaseStart && editStart < phaseStart) {
        setEditError(`Start date cannot be before phase start (${phaseStart})`)
        return
      }
      if (phaseEnd && editEnd > phaseEnd) {
        setEditError(`End date cannot be after phase end (${phaseEnd})`)
        return
      }
    }

    setSaving(true)
    setEditError(null)
    const endpoint = data.type === 'phase'
      ? `/api/admin-phases/${props.workItemId}`
      : `/api/admin-tasks/${props.workItemId}`
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), startDate: editStart, endDate: editEnd }),
    })
    setSaving(false)
    setEditMode(false)
    load()
  }

  async function deleteTask() {
    setDeleting(true)
    const res = await fetch(`/api/admin-tasks/${props.workItemId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) return
    props.onAssignmentChange?.()
    setDrawer(null)
    router.refresh()
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
        onSave={() => { setFlowMode(null); load(); props.onAssignmentChange?.() }}
      />
    )
  }

  if (editMode && data) {
    return (
      <div className={styles.root}>
        <div className={styles.editHeader}>
          <button type="button" className={styles.backBtn} onClick={() => setEditMode(false)}>‹ BACK</button>
          <span className={styles.editTitle}>{data.type === 'task' ? 'EDIT TASK' : 'EDIT PHASE'}</span>
        </div>

        <div className={styles.editField}>
          <label className={styles.editLabel} htmlFor="edit-name">NAME</label>
          <input
            id="edit-name"
            type="text"
            className={styles.editInput}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.editField}>
          <label className={styles.editLabel} htmlFor="edit-start">START DATE</label>
          <input
            id="edit-start"
            type="date"
            className={styles.editInput}
            value={editStart}
            onChange={e => setEditStart(e.target.value)}
          />
        </div>

        <div className={styles.editField}>
          <label className={styles.editLabel} htmlFor="edit-end">END DATE</label>
          <input
            id="edit-end"
            type="date"
            className={styles.editInput}
            value={editEnd}
            onChange={e => setEditEnd(e.target.value)}
          />
        </div>

        {editError && <div className={styles.editError}>{editError}</div>}

        <div className={styles.editActions}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={saveEdit}
            disabled={saving || !editName.trim() || !editStart || !editEnd}
          >
            {saving ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
          <button type="button" className={styles.cancelEditBtn} onClick={() => setEditMode(false)}>
            CANCEL
          </button>
        </div>
      </div>
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
                className={styles.empAvatarBtn}
                onClick={() => openEmployee(member.employeeId)}
              >
                <UtilizationRing
                  size="xs"
                  pct={0}
                  name={member.employeeName}
                  avatarColor={member.employeeColor ?? '#9a9484'}
                />
              </button>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{member.employeeName}</span>
                {member.roleName && <span className={styles.memberRole}>{member.roleName}</span>}
                {member.description && <span className={styles.memberDesc}>{member.description}</span>}
              </div>
              <div className={styles.memberRight}>
                <span className={styles.memberHours}>
                  {member.hours}h
                  {member.rate != null && <> · ${Math.round(member.hours * member.rate).toLocaleString('en-US')}</>}
                </span>
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
                className={styles.empAvatarBtn}
                onClick={() => openEmployee(member.employeeId)}
              >
                <UtilizationRing
                  size="xs"
                  pct={0}
                  name={member.employeeName}
                  avatarColor={member.employeeColor ?? '#9a9484'}
                />
              </button>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{member.employeeName}</span>
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
        {type === 'phase' && (
          <button type="button" className={styles.editPhaseBtn} onClick={openEdit}>
            EDIT PHASE
          </button>
        )}
        {type === 'task' && !confirmDelete && (
          <button type="button" className={styles.editPhaseBtn} onClick={openEdit}>
            EDIT TASK
          </button>
        )}
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
        {type === 'task' && !confirmDelete && (
          <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
            DELETE
          </button>
        )}
      </div>
      {type === 'task' && confirmDelete && (
        <div className={styles.deleteConfirm}>
          <span className={styles.deleteConfirmText}>Permanently delete this task?</span>
          <button
            type="button"
            className={styles.deleteConfirmBtn}
            onClick={deleteTask}
            disabled={deleting}
          >
            {deleting ? '…' : 'YES, DELETE'}
          </button>
          <button
            type="button"
            className={styles.deleteCancelBtn}
            onClick={() => setConfirmDelete(false)}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  )
}
