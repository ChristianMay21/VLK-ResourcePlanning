'use client'

import { useState, useEffect } from 'react'
import { useDrawer } from '@/context/DrawerContext'
import styles from './EmployeeForm.module.scss'

const AVATAR_COLORS = [
  '#2c4a6e', '#b8862e', '#4a7c59', '#5a7fa3',
  '#9a6a4a', '#7a5c8a', '#b5432f', '#6b6558',
]

type EmployeeFormProps = {
  employeeId?: string
  onSave?: () => void
}

type EmployeeData = {
  id: string
  name: string
  jobTitle: string | null
  maximumHours: number
  baseHourlyRate: number | null
  color: string | null
  managerId: string | null
  skills: string[]
  sectorExperience: string[]
}

type EmployeeOption = { id: string; name: string }
type SectorOption = { id: string; name: string }
type SkillOption = { id: string; name: string }

export default function EmployeeForm(props: EmployeeFormProps) {
  const { setDrawer } = useDrawer()
  const isEdit = Boolean(props.employeeId)

  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [managerId, setManagerId] = useState('')
  const [capacity, setCapacity] = useState('40')
  const [baseHourlyRate, setBaseHourlyRate] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [skills, setSkills] = useState<string[]>([])
  const [sectorExp, setSectorExp] = useState<string[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    Promise.all([
      fetch('/api/employees?limit=200').then(r => r.json()),
      fetch('/api/sectors?limit=200&sort=name').then(r => r.json()),
      fetch('/api/skills?limit=200&sort=name').then(r => r.json()),
    ]).then(([empData, sectorData, skillData]) => {
      setEmployees((empData.docs ?? []).map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })))
      setSectors((sectorData.docs ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
      setSkillOptions((skillData.docs ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    })

    if (props.employeeId) {
      fetch(`/api/admin-employees/${props.employeeId}`).then(r => r.json()).then((data: EmployeeData) => {
        setName(data.name)
        setJobTitle(data.jobTitle ?? '')
        setManagerId(data.managerId ?? '')
        setCapacity(String(data.maximumHours))
        setBaseHourlyRate(data.baseHourlyRate != null ? String(data.baseHourlyRate) : '')
        setColor(data.color ?? AVATAR_COLORS[0])
        setSkills(data.skills)
        setSectorExp(data.sectorExperience)
        setLoading(false)
      })
    }
  }, [props.employeeId])

  function toggleSkill(skill: string) {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  function toggleSector(sector: string) {
    setSectorExp(prev => prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector])
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const body = {
      name: name.trim(),
      jobTitle: jobTitle.trim() || undefined,
      manager: managerId || undefined,
      maximumHours: parseInt(capacity) || 40,
      baseHourlyRate: baseHourlyRate !== '' ? parseFloat(baseHourlyRate) : undefined,
      color,
      skills: skills.map(s => ({ skill: s })),
      sectorExperience: sectorExp.map(s => ({ sector: s })),
    }

    if (props.employeeId) {
      await fetch(`/api/admin-employees/${props.employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/admin-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    setSaving(false)
    props.onSave?.()
    setDrawer(null)
  }

  if (loading) return <div className={styles.loading}>Loading…</div>

  const otherEmployees = employees.filter(e => e.id !== props.employeeId)

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{isEdit ? 'EDIT EMPLOYEE' : 'ADD EMPLOYEE'}</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ef-name">NAME</label>
        <input id="ef-name" type="text" className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ef-title">TITLE</label>
        <input id="ef-title" type="text" className={styles.input} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title" />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ef-manager">MANAGER</label>
        <select id="ef-manager" className={styles.input} value={managerId} onChange={e => setManagerId(e.target.value)}>
          <option value="">— None —</option>
          {otherEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ef-capacity">WEEKLY CAPACITY (HOURS)</label>
        <input id="ef-capacity" type="number" min="1" max="80" className={styles.input} value={capacity} onChange={e => setCapacity(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ef-rate">BASE HOURLY RATE ($/HR)</label>
        <input id="ef-rate" type="number" min="0" className={styles.input} value={baseHourlyRate} onChange={e => setBaseHourlyRate(e.target.value)} />
      </div>

      <div className={styles.field}>
        <div className={styles.label}>AVATAR COLOR</div>
        <div className={styles.swatchRow}>
          {AVATAR_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={styles.swatch}
              style={{ background: c }}
              data-selected={c === color ? 'true' : undefined}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.label}>SKILLS</div>
        <div className={styles.chipGrid}>
          {skillOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={styles.chipToggle}
              data-selected={skills.includes(opt.name) ? 'true' : undefined}
              onClick={() => toggleSkill(opt.name)}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.label}>SECTOR EXPERIENCE/PREFERENCE</div>
        <div className={styles.chipGrid}>
          {sectors.map(sector => (
            <button
              key={sector.id}
              type="button"
              className={styles.chipToggle}
              data-selected={sectorExp.includes(sector.name) ? 'true' : undefined}
              onClick={() => toggleSector(sector.name)}
            >
              {sector.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={() => setDrawer(null)}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
