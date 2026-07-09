'use client'

import { useState, useEffect } from 'react'
import { rollingUtilizationPct, utilizationColor, weeklySchedule, type AssignmentForUtil } from '@/lib/utilization'
import { parseDate, daysBetween } from '@/lib/dateUtils'
import styles from './AssignmentFlow.module.scss'

type Candidate = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  weeklyCapacity: number
  availabilityPct: number
  sectorMatch: boolean
  skillsMatch: number
  skillsTotal: number
  assignmentsForUtil: AssignmentForUtil[]
}

type Role = { id: string; name: string }

type AssignmentFlowProps = {
  workItemId: string
  workItemType: 'phase' | 'task'
  workItemStartDate: string
  workItemEndDate: string
  projectId: string
  onClose: () => void
  onSave: () => void
}

type SortKey = 'availability' | 'sectorMatch' | 'skillsMatch'
type SortDir = 'asc' | 'desc'

function assignmentWeeklyRate(hours: number, startDate: string, endDate: string): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const totalDays = Math.max(daysBetween(start, end) + 1, 1)
  const weeks = Math.max(totalDays / 7, 0.5)
  return hours / weeks
}

function capacityWarning(
  existing: AssignmentForUtil[],
  newHours: number,
  startDate: string,
  endDate: string,
  weeklyCapacity: number,
): string | null {
  const newRate = assignmentWeeklyRate(newHours, startDate, endDate)
  const newAssignment: AssignmentForUtil = { hours: newHours, startDate, endDate }
  const allAssignments = [...existing, newAssignment]
  const today = new Date()
  const schedule = weeklySchedule(allAssignments, 12, today)

  // Check weeks within the work item's date range for overages
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const overWeeks = schedule.filter(w => w.hours > weeklyCapacity && w.weekStart >= start && w.weekStart <= end)

  if (overWeeks.length > 0) {
    const maxHours = Math.round(Math.max(...overWeeks.map(w => w.hours)))
    return `Adding ${newRate.toFixed(1)} hrs/week would push ${overWeeks.length} week${overWeeks.length > 1 ? 's' : ''} to ${maxHours}+ hrs (capacity: ${weeklyCapacity})`
  }
  return null
}

export default function AssignmentFlow(props: AssignmentFlowProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('availability')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Candidate | null>(null)

  // Step 2 state
  const [hours, setHours] = useState('')
  const [roleId, setRoleId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/assignment-candidates?workItemId=${props.workItemId}&workItemType=${props.workItemType}&projectId=${props.projectId}`)
      .then(r => r.json())
      .then(d => {
        setCandidates(d.candidates ?? [])
        setRoles(d.roles ?? [])
        if (d.roles?.[0]) setRoleId(d.roles[0].id)
        setLoading(false)
      })
  }, [props.workItemId, props.workItemType, props.projectId])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'availability' ? 'asc' : 'desc')
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    let diff = 0
    if (sortKey === 'availability') diff = a.availabilityPct - b.availabilityPct
    else if (sortKey === 'sectorMatch') diff = (b.sectorMatch ? 1 : 0) - (a.sectorMatch ? 1 : 0)
    else if (sortKey === 'skillsMatch') diff = b.skillsMatch - a.skillsMatch
    return sortDir === 'asc' ? diff : -diff
  })

  const numHours = parseFloat(hours)
  const capWarning = selected && !isNaN(numHours) && numHours > 0
    ? capacityWarning(selected.assignmentsForUtil, numHours, props.workItemStartDate, props.workItemEndDate, selected.weeklyCapacity)
    : null

  async function handleSave() {
    if (!selected || isNaN(numHours) || numHours <= 0 || !roleId) return
    setSaving(true)
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workItemType: props.workItemType,
        workItemId: props.workItemId,
        employeeId: selected.id,
        roleId,
        hours: numHours,
        description: description || undefined,
      }),
    })
    setSaving(false)
    props.onSave()
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (loading) return <div className={styles.loading}>Loading candidates…</div>

  if (selected) {
    return (
      <div className={styles.root}>
        <div className={styles.flowHeader}>
          <button type="button" className={styles.backBtn} onClick={() => setSelected(null)}>‹ BACK</button>
          <span className={styles.flowTitle}>CONFIGURE ASSIGNMENT</span>
        </div>

        <div className={styles.selectedEmp}>
          <span
            className={styles.empDot}
            style={{ background: selected.color ?? '#9a9484' }}
          />
          <span className={styles.empName}>{selected.name}</span>
          {selected.jobTitle && <span className={styles.empTitle}>{selected.jobTitle}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="flow-hours">BILLABLE HOURS</label>
          <input
            id="flow-hours"
            type="number"
            min="0"
            step="0.5"
            className={styles.input}
            value={hours}
            onChange={e => setHours(e.target.value)}
            placeholder="e.g. 80"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="flow-role">ROLE</label>
          <select
            id="flow-role"
            className={styles.input}
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="flow-desc">DESCRIPTION</label>
          <textarea
            id="flow-desc"
            className={styles.input}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional work description…"
            rows={3}
          />
        </div>

        {capWarning && (
          <div className={styles.warning}>⚠ {capWarning}</div>
        )}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleSave}
            disabled={saving || isNaN(numHours) || numHours <= 0 || !roleId}
          >
            {saving ? 'SAVING…' : 'CONFIRM ASSIGNMENT'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={props.onClose}>
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.flowHeader}>
        <button type="button" className={styles.backBtn} onClick={props.onClose}>‹ BACK</button>
        <span className={styles.flowTitle}>SELECT EMPLOYEE</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>EMPLOYEE</th>
            <th className={styles.th} data-sortable="true" onClick={() => handleSort('availability')}>
              AVAILABILITY{sortArrow('availability')}
            </th>
            <th className={styles.th} data-sortable="true" onClick={() => handleSort('sectorMatch')}>
              SECTOR{sortArrow('sectorMatch')}
            </th>
            <th className={styles.th} data-sortable="true" onClick={() => handleSort('skillsMatch')}>
              SKILLS{sortArrow('skillsMatch')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(emp => {
            const utilColor = utilizationColor(emp.availabilityPct)
            return (
              <tr key={emp.id} className={styles.candidateRow} onClick={() => setSelected(emp)}>
                <td className={styles.td}>
                  <div className={styles.candEmpCell}>
                    <span className={styles.empDot} style={{ background: emp.color ?? '#9a9484' }} />
                    <span className={styles.candName}>{emp.name}</span>
                    {emp.jobTitle && <span className={styles.candTitle}>{emp.jobTitle}</span>}
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.availPct} style={{ color: utilColor }}>
                    {Math.round(emp.availabilityPct)}%
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={emp.sectorMatch ? styles.matchYes : styles.matchNo}>
                    {emp.sectorMatch ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={styles.skillCount}>
                    {emp.skillsMatch}/{emp.skillsTotal}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
