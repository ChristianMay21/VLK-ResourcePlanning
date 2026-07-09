'use client'

import { useState } from 'react'
import styles from './ProjectBudget.module.scss'

const PHASE_COLORS = ['#2c4a6e', '#4a7c59', '#b8862e', '#5a7fa3', '#9a6a4a', '#7a5c8a', '#b5432f', '#6b6558']

function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function pctOf(n: number): string {
  return Math.round(n) + '%'
}

type PhaseBudgetData = {
  id: string
  name: string
  budgetAllocation: number | null
  cost: number
}

type ProjectBudgetProps = {
  projectId: string
  budget: number | null
  phases: PhaseBudgetData[]
}

export default function ProjectBudget(props: ProjectBudgetProps) {
  const [budget, setBudget] = useState<number | null>(props.budget)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)

  const [allocations, setAllocations] = useState<Record<string, number | null>>(() => {
    const m: Record<string, number | null> = {}
    props.phases.forEach(p => { m[p.id] = p.budgetAllocation })
    return m
  })
  const [editingPhase, setEditingPhase] = useState<string | null>(null)
  const [phaseDraft, setPhaseDraft] = useState('')
  const [savingPhase, setSavingPhase] = useState(false)
  const [phaseError, setPhaseError] = useState<string | null>(null)

  const totalAllocated = props.phases.reduce((sum, p) => sum + (allocations[p.id] ?? 0), 0)
  const totalUnallocated = budget != null ? budget - totalAllocated : null
  const allocatedPct = budget != null && budget > 0 ? (totalAllocated / budget) * 100 : 0
  const unallocatedPct = budget != null && budget > 0 && totalUnallocated != null
    ? (totalUnallocated / budget) * 100
    : 0

  async function saveBudget() {
    const val = parseFloat(budgetDraft)
    if (isNaN(val) || val < 0) return
    setSavingBudget(true)
    const res = await fetch(`/api/admin-projects/${props.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: val }),
    })
    setSavingBudget(false)
    if (res.ok) {
      setBudget(val)
      setEditingBudget(false)
    }
  }

  function startEditBudget() {
    setBudgetDraft(budget != null ? String(budget) : '')
    setEditingBudget(true)
  }

  async function savePhaseAllocation(phaseId: string) {
    const val = parseFloat(phaseDraft)
    if (isNaN(val) || val < 0) { setPhaseError('Enter a valid amount'); return }

    if (budget != null) {
      const otherAllocated = props.phases
        .filter(p => p.id !== phaseId)
        .reduce((sum, p) => sum + (allocations[p.id] ?? 0), 0)
      if (otherAllocated + val > budget) {
        setPhaseError(`Exceeds remaining budget (${fmtMoney(budget - otherAllocated)} available)`)
        return
      }
    }

    setSavingPhase(true)
    setPhaseError(null)
    const res = await fetch(`/api/admin-phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetAllocation: val }),
    })
    setSavingPhase(false)
    if (res.ok) {
      setAllocations(prev => ({ ...prev, [phaseId]: val }))
      setEditingPhase(null)
    }
  }

  function startEditPhase(phase: PhaseBudgetData) {
    setPhaseDraft(allocations[phase.id] != null ? String(allocations[phase.id]) : '')
    setPhaseError(null)
    setEditingPhase(phase.id)
  }

  return (
    <div className={styles.root}>
      {/* STAFF BUDGET header */}
      <div className={styles.budgetRow}>
        <span className={styles.budgetLabel}>STAFF BUDGET</span>
        {editingBudget ? (
          <div className={styles.budgetEditInline}>
            <span className={styles.dollarSign}>$</span>
            <input
              type="number"
              min="0"
              className={styles.budgetInput}
              value={budgetDraft}
              onChange={e => setBudgetDraft(e.target.value)}
              autoFocus
            />
            <button type="button" className={styles.saveBtn} onClick={saveBudget} disabled={savingBudget}>
              {savingBudget ? 'SAVING…' : 'SAVE'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditingBudget(false)}>CANCEL</button>
          </div>
        ) : (
          <>
            <span className={styles.budgetValue}>{budget != null ? fmtMoney(budget) : '—'}</span>
            <button type="button" className={styles.editBtn} onClick={startEditBudget}>
              {budget != null ? 'EDIT' : 'SET BUDGET'}
            </button>
          </>
        )}
      </div>

      {/* ALLOCATED / UNALLOCATED summary */}
      {budget != null && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>ALLOCATED</span>
            <span className={styles.summaryCellValue}>{fmtMoney(totalAllocated)}</span>
            {budget > 0 && <span className={styles.summaryCellPct}>({pctOf(allocatedPct)})</span>}
          </div>
          <div className={styles.summaryCellDivider} />
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>UNALLOCATED</span>
            <span
              className={styles.summaryCellValue}
              data-over={totalUnallocated != null && totalUnallocated < 0 ? 'true' : undefined}
            >
              {totalUnallocated != null ? fmtMoney(Math.abs(totalUnallocated)) : '—'}
              {totalUnallocated != null && totalUnallocated < 0 && ' over'}
            </span>
            {budget > 0 && totalUnallocated != null && (
              <span className={styles.summaryCellPct}>({pctOf(Math.abs(unallocatedPct))})</span>
            )}
          </div>
        </div>
      )}

      {/* BUDGET ALLOCATION BY PHASE — single bordered box */}
      {props.phases.length > 0 && (
        <div className={styles.allocationBox}>
          <div className={styles.allocationTitle}>BUDGET ALLOCATION BY PHASE</div>

          {budget != null && budget > 0 && (
            <>
              {/* Stacked bar */}
              <div className={styles.bar}>
                {props.phases.map((phase, i) => {
                  const alloc = allocations[phase.id] ?? 0
                  if (alloc <= 0) return null
                  const widthPct = (alloc / budget) * 100
                  const spentPct = Math.min((phase.cost / alloc) * 100, 100)
                  const color = PHASE_COLORS[i % PHASE_COLORS.length]
                  return (
                    <div
                      key={phase.id}
                      className={styles.barSegment}
                      style={{ width: `${widthPct}%`, background: color } as React.CSSProperties}
                      title={`${phase.name}: ${fmtMoney(alloc)} allocated, ${fmtMoney(phase.cost)} spent`}
                    >
                      <div className={styles.barSpent} style={{ width: `${spentPct}%` }} />
                      {widthPct > 8 && (
                        <span className={styles.barLabel}>{phase.name}</span>
                      )}
                    </div>
                  )
                })}
                {totalUnallocated != null && totalUnallocated > 0 && (
                  <div
                    className={styles.barUnallocated}
                    style={{ width: `${(totalUnallocated / budget) * 100}%` }}
                    title="Unallocated"
                  />
                )}
              </div>

              {/* Legend */}
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendSpent} />
                  Spent within allocation
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendAlloc} />
                  Direct project-level cost
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendUnalloc} />
                  Unallocated
                </span>
              </div>
            </>
          )}

          {/* Phase rows */}
          <div className={styles.phaseRows}>
            {props.phases.map((phase, i) => {
              const color = PHASE_COLORS[i % PHASE_COLORS.length]
              const alloc = allocations[phase.id]
              const pct = budget != null && budget > 0 && alloc != null
                ? (alloc / budget) * 100
                : null
              const isEditing = editingPhase === phase.id

              return (
                <div key={phase.id} className={styles.phaseRow}>
                  <div className={styles.phaseRowMain}>
                    <span className={styles.phaseDot} style={{ background: color }} />
                    <span className={styles.phaseName}>{phase.name}</span>
                    {pct != null && (
                      <span className={styles.phasePct}>{pctOf(pct)} of budget</span>
                    )}
                    {phase.cost > 0 && (
                      <span className={styles.phaseCost}>cost {fmtMoney(phase.cost)}</span>
                    )}
                    {isEditing ? (
                      <div className={styles.phaseEditGroup}>
                        <input
                          type="number"
                          min="0"
                          className={styles.phaseInput}
                          value={phaseDraft}
                          onChange={e => { setPhaseDraft(e.target.value); setPhaseError(null) }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={styles.phaseActionBtn}
                          onClick={() => savePhaseAllocation(phase.id)}
                          disabled={savingPhase}
                        >
                          {savingPhase ? '…' : 'SAVE'}
                        </button>
                        <button
                          type="button"
                          className={styles.phaseCancelBtn}
                          onClick={() => { setEditingPhase(null); setPhaseError(null) }}
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={styles.phaseAllocValue}>
                          {alloc != null ? fmtMoney(alloc) : '—'}
                        </span>
                        <button
                          type="button"
                          className={styles.phaseActionBtn}
                          onClick={() => startEditPhase(phase)}
                        >
                          EDIT
                        </button>
                      </>
                    )}
                  </div>
                  {isEditing && phaseError && (
                    <div className={styles.phaseError}>{phaseError}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
