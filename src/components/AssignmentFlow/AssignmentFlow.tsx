'use client'

import { useState, useEffect } from 'react'
import { rollingUtilizationPct, utilizationColor, weeklySchedule, type AssignmentForUtil } from '@/lib/utilization'
import { parseDate, daysBetween } from '@/lib/dateUtils'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import styles from './AssignmentFlow.module.scss'

type Candidate = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  weeklyCapacity: number
  baseHourlyRate: number | null
  availabilityPct: number
  sectorMatch: boolean
  skillsMatch: number
  skillsTotal: number
  assignmentsForUtil: AssignmentForUtil[]
}

type Role = { id: string; name: string }

type BudgetData = {
  projectBudget: number | null
  projectName: string
  projectExistingCost: number
  workItemBudget: number | null
  workItemExistingCost: number
  workItemName: string
}

type EditingAssignment = {
  assignmentId: string
  employeeId: string
  employeeName: string
  employeeColor: string | null
  jobTitle: string | null
  roleId: string
  hours: string
  description: string
  rate: string
}

type AssignmentFlowProps = {
  workItemId: string
  workItemType: 'phase' | 'task' | 'project'
  workItemStartDate: string
  workItemEndDate: string
  projectId: string | null
  isInternal?: boolean
  categoryId?: string | null
  editingAssignment?: EditingAssignment
  onClose: () => void
  onSave: () => void
}

type SortKey = 'availability' | 'sectorMatch' | 'skillsMatch'
type SortDir = 'asc' | 'desc'

function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

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
  const [empProjectRates, setEmpProjectRates] = useState<Record<string, number>>({})
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('availability')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Candidate | null>(null)

  // Step 2 state
  const [hours, setHours] = useState('')
  const [roleId, setRoleId] = useState('')
  const [description, setDescription] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      workItemId: props.workItemId,
      workItemType: props.workItemType,
    })
    if (props.isInternal && props.categoryId) {
      params.set('categoryId', props.categoryId)
    } else if (props.projectId) {
      params.set('projectId', props.projectId)
    }
    fetch(`/api/assignment-candidates?${params}`)
      .then(r => r.json())
      .then(d => {
        const candidateList: Candidate[] = d.candidates ?? []
        const roleList: Role[] = d.roles ?? []
        const rateMap: Record<string, number> = d.empProjectRates ?? {}
        setCandidates(candidateList)
        setRoles(roleList)
        setEmpProjectRates(rateMap)
        setBudgetData(d.budgetData ?? null)

        if (props.editingAssignment) {
          const ea = props.editingAssignment
          const match = candidateList.find(c => c.id === ea.employeeId)
          setSelected(match ?? {
            id: ea.employeeId,
            name: ea.employeeName,
            color: ea.employeeColor,
            jobTitle: ea.jobTitle,
            weeklyCapacity: 40,
            baseHourlyRate: null,
            availabilityPct: 0,
            sectorMatch: false,
            skillsMatch: 0,
            skillsTotal: 0,
            assignmentsForUtil: [],
          })
          setHours(ea.hours)
          setRoleId(ea.roleId)
          setDescription(ea.description)
          setRate(ea.rate)
        } else if (roleList[0]) {
          setRoleId(roleList[0].id)
        }
        setLoading(false)
      })
  }, [props.workItemId, props.workItemType, props.projectId, props.isInternal, props.categoryId, props.editingAssignment])

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

  function handleSelectEmployee(emp: Candidate) {
    setSelected(emp)
    const projectRate = empProjectRates[emp.id]
    const fallback = projectRate ?? emp.baseHourlyRate
    setRate(fallback != null ? String(fallback) : '')
  }

  async function handleSave() {
    if (!selected || isNaN(numHours) || numHours <= 0 || !roleId) return
    setSaving(true)
    const numRate = parseFloat(rate)

    if (props.editingAssignment) {
      const body: Record<string, unknown> = {
        roleId,
        hours: numHours,
        description: description || undefined,
        employeeId: selected.id,
      }
      if (!props.isInternal) {
        if (!isNaN(numRate)) body.rate = numRate
        if (props.projectId) body.projectId = props.projectId
      }
      await fetch(`/api/assignments/${props.editingAssignment.assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      const body: Record<string, unknown> = {
        workItemType: props.workItemType,
        workItemId: props.workItemId,
        employeeId: selected.id,
        roleId,
        hours: numHours,
        description: description || undefined,
      }
      if (!props.isInternal) {
        if (!isNaN(numRate)) body.rate = numRate
        if (props.projectId) body.projectId = props.projectId
      }
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    props.onSave()
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (loading) return <div className={styles.loading}>Loading candidates…</div>

  if (selected) {
    return (
      <div className={styles.root}>
        <div className={styles.flowHeader}>
          <button type="button" className={styles.backBtn} onClick={() => props.editingAssignment ? props.onClose() : setSelected(null)}>‹ BACK</button>
          <span className={styles.flowTitle}>{props.editingAssignment ? 'EDIT ASSIGNMENT' : 'CONFIGURE ASSIGNMENT'}</span>
        </div>

        <div className={styles.selectedEmp}>
          <UtilizationRing
            size="xs"
            pct={selected.availabilityPct}
            name={selected.name}
            avatarColor={selected.color ?? '#9a9484'}
          />
          <span className={styles.empName}>{selected.name}</span>
          {selected.jobTitle && <span className={styles.empTitle}>{selected.jobTitle}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="flow-hours">{props.isInternal ? 'COMMITTED HOURS' : 'BILLABLE HOURS'}</label>
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

        {!props.isInternal && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="flow-rate">HOURLY RATE FOR THIS WORK ($/HR)</label>
            <div className={styles.moneyField}>
              <span className={styles.moneyPrefix} aria-hidden="true">$</span>
              <input
                id="flow-rate"
                type="number"
                min="0"
                className={styles.moneyInput}
                value={rate}
                onChange={e => setRate(e.target.value)}
              />
            </div>
            <div className={styles.rateNote}>Shared across all of {selected.name}&apos;s work on this project — editing it here updates it everywhere.</div>
          </div>
        )}

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

        {!props.isInternal && budgetData && (() => {
          const numRate = parseFloat(rate)
          const thisCost = !isNaN(numHours) && numHours > 0 && !isNaN(numRate) && numRate > 0
            ? numHours * numRate
            : null
          const showPanel = thisCost != null || budgetData.projectBudget != null

          if (!showPanel) return null

          const newProjectCost = budgetData.projectExistingCost + (thisCost ?? 0)
          const projectRemaining = budgetData.projectBudget != null
            ? budgetData.projectBudget - newProjectCost
            : null
          const projectPct = budgetData.projectBudget != null && budgetData.projectBudget > 0
            ? (newProjectCost / budgetData.projectBudget) * 100
            : null

          const newWorkItemCost = budgetData.workItemExistingCost + (thisCost ?? 0)
          const workItemRemaining = budgetData.workItemBudget != null
            ? budgetData.workItemBudget - newWorkItemCost
            : null
          const workItemPct = budgetData.workItemBudget != null && budgetData.workItemBudget > 0
            ? (newWorkItemCost / budgetData.workItemBudget) * 100
            : null

          return (
            <div className={styles.budgetImpact}>
              <div className={styles.budgetImpactLabel}>BUDGET IMPACT</div>
              {thisCost != null && (
                <div className={styles.budgetImpactLine}>
                  This assignment: <strong>{fmtMoney(thisCost)}</strong>
                </div>
              )}
              {budgetData.workItemBudget != null && (
                <div
                  className={styles.budgetImpactLine}
                  data-over={workItemRemaining != null && workItemRemaining < 0 ? 'true' : undefined}
                >
                  {budgetData.workItemName}: {fmtMoney(newWorkItemCost)} of {fmtMoney(budgetData.workItemBudget)} allocated
                  {workItemPct != null && <> ({Math.round(workItemPct)}%)</>}
                  {workItemRemaining != null && (
                    <> — {workItemRemaining >= 0 ? fmtMoney(workItemRemaining) + ' remaining' : fmtMoney(Math.abs(workItemRemaining)) + ' over'}</>
                  )}
                </div>
              )}
              {budgetData.projectBudget != null && (
                <div
                  className={styles.budgetImpactLine}
                  data-over={projectRemaining != null && projectRemaining < 0 ? 'true' : undefined}
                >
                  {budgetData.projectName}: {fmtMoney(newProjectCost)} of {fmtMoney(budgetData.projectBudget)} budget
                  {projectPct != null && <> ({Math.round(projectPct)}%)</>}
                  {projectRemaining != null && (
                    <> — {projectRemaining >= 0 ? fmtMoney(projectRemaining) + ' remaining' : fmtMoney(Math.abs(projectRemaining)) + ' over'}</>
                  )}
                </div>
              )}
            </div>
          )
        })()}

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
            {saving ? 'SAVING…' : props.editingAssignment ? 'SAVE CHANGES' : 'CONFIRM ASSIGNMENT'}
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
              <tr key={emp.id} className={styles.candidateRow} onClick={() => handleSelectEmployee(emp)}>
                <td className={styles.td}>
                  <div className={styles.candEmpCell}>
                    <UtilizationRing
                      size="xs"
                      pct={emp.availabilityPct}
                      name={emp.name}
                      avatarColor={emp.color ?? '#9a9484'}
                    />
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
