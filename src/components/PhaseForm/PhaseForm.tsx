'use client'

import { useState } from 'react'
import { useDrawer } from '@/context/DrawerContext'
import styles from './PhaseForm.module.scss'

type PhaseFormProps = {
  projectId: string
  onSave: () => void
}

export default function PhaseForm(props: PhaseFormProps) {
  const { setDrawer } = useDrawer()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin-phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: props.projectId, name: name.trim(), startDate, endDate }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create phase')
      return
    }
    setDrawer(null)
    props.onSave()
  }

  const canSave = name.trim().length > 0 && startDate !== '' && endDate !== ''

  return (
    <div className={styles.root}>
      <div className={styles.title}>NEW PHASE</div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="phase-name">NAME</label>
        <input
          id="phase-name"
          type="text"
          className={styles.input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Phase name…"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="phase-start">START DATE</label>
        <input
          id="phase-start"
          type="date"
          className={styles.input}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="phase-end">END DATE</label>
        <input
          id="phase-end"
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
          {saving ? 'CREATING…' : 'CREATE PHASE'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={() => setDrawer(null)}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
