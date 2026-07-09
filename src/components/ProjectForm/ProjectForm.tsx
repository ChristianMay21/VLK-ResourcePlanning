'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDrawer } from '@/context/DrawerContext'
import styles from './ProjectForm.module.scss'

type ProjectFormProps = {}

type ClientOption = { id: string; name: string }
type SectorOption = { id: string; name: string }

export default function ProjectForm(props: ProjectFormProps) {
  void props

  const { setDrawer } = useDrawer()
  const router = useRouter()

  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/clients?limit=200').then(r => r.json()),
      fetch('/api/sectors?limit=200').then(r => r.json()),
    ]).then(([clientData, sectorData]) => {
      const clientList: ClientOption[] = (clientData.docs ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      setClients(clientList)
      if (clientList[0]) setClientId(clientList[0].id)
      setSectors((sectorData.docs ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    })
  }, [])

  const canSave = Boolean(name.trim() && clientId && startDate && endDate && budget)

  async function handleSave() {
    if (!canSave) return
    setError(null)
    setSaving(true)

    const res = await fetch('/api/admin-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        clientId,
        sectorId: sectorId || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        startDate,
        endDate,
      }),
    })

    if (!res.ok) {
      setError('Failed to create project.')
      setSaving(false)
      return
    }

    const data: { id: string } = await res.json()
    setDrawer(null)
    router.push(`/projects/${data.id}`)
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>NEW PROJECT</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-name">NAME</label>
        <input
          id="pf-name"
          type="text"
          className={styles.input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-client">CLIENT</label>
        {clients.length === 0 ? (
          <span className={styles.emptyNote}>No clients yet — add one in the Payload admin first.</span>
        ) : (
          <select id="pf-client" className={styles.input} value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-sector">SECTOR</label>
        <select id="pf-sector" className={styles.input} value={sectorId} onChange={e => setSectorId(e.target.value)}>
          <option value="">— None —</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pf-start">START DATE</label>
          <input
            id="pf-start"
            type="date"
            className={styles.input}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pf-end">END DATE</label>
          <input
            id="pf-end"
            type="date"
            className={styles.input}
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pf-budget">BUDGET ($)</label>
        <div className={styles.moneyField}>
          <span className={styles.moneyPrefix} aria-hidden="true">$</span>
          <input
            id="pf-budget"
            type="number"
            min="0"
            step="1000"
            className={styles.moneyInput}
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'CREATING…' : 'CREATE PROJECT'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={() => setDrawer(null)}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
