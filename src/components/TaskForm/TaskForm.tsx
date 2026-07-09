'use client'

import { useState } from 'react'
import { useDrawer } from '@/context/DrawerContext'
import styles from './TaskForm.module.scss'

type TaskFormProps = {
  phaseId?: string
  phaseName?: string
  phaseStartDate?: string
  phaseEndDate?: string
  categoryId?: string
  categoryName?: string
  onSave: () => void
}

export default function TaskForm(props: TaskFormProps) {
  const { setDrawer } = useDrawer()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contextLabel = props.phaseName ?? props.categoryName ?? ''

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    const phaseStart = props.phaseStartDate?.slice(0, 10)
    const phaseEnd = props.phaseEndDate?.slice(0, 10)
    if (phaseStart && startDate < phaseStart) {
      setError(`Start date cannot be before phase start (${phaseStart})`)
      return
    }
    if (phaseEnd && endDate > phaseEnd) {
      setError(`End date cannot be after phase end (${phaseEnd})`)
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        startDate,
        endDate,
        phaseId: props.phaseId,
        categoryId: props.categoryId,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create task')
      return
    }
    setDrawer(null)
    props.onSave()
  }

  const canSave = name.trim().length > 0 && startDate !== '' && endDate !== ''

  return (
    <div className={styles.root}>
      <div className={styles.title}>NEW TASK</div>
      {contextLabel && (
        <div className={styles.context}>
          {props.phaseName ? 'Phase: ' : 'Category: '}<strong>{contextLabel}</strong>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-name">NAME</label>
        <input
          id="task-name"
          type="text"
          className={styles.input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Task name…"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-start">START DATE</label>
        <input
          id="task-start"
          type="date"
          className={styles.input}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-end">END DATE</label>
        <input
          id="task-end"
          type="date"
          className={styles.input}
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'CREATING…' : 'CREATE TASK'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={() => setDrawer(null)}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
