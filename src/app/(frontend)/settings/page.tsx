'use client'

import { useState, useEffect, useCallback } from 'react'
import EmployeeForm from '@/components/EmployeeForm/EmployeeForm'
import { useDrawer } from '@/context/DrawerContext'
import { getInitials } from '@/lib/dateUtils'
import styles from './page.module.scss'

const ALLOWED_ON_OPTIONS = [
  { value: 'projects', label: 'Project' },
  { value: 'project-phases', label: 'Phase' },
  { value: 'tasks', label: 'Task' },
  { value: 'internal', label: 'Internal' },
] as const

type AllowedOnValue = 'projects' | 'project-phases' | 'tasks' | 'internal'

const TYPE_LABELS: Record<string, string> = {
  projects: 'projects',
  'project-phases': 'phases',
  tasks: 'tasks',
  internal: 'internal',
}

const DEFAULT_ALLOWED_ON: AllowedOnValue[] = ['projects', 'project-phases', 'tasks', 'internal']

type Employee = {
  id: string
  name: string
  jobTitle: string | null
  managerName: string | null
  capacity: number
  baseHourlyRate: number | null
  color: string | null
}

type Client = { id: string; name: string }
type Role = { id: string; name: string; allowedOn: AllowedOnValue[] }
type Sector = { id: string; name: string }
type Skill = { id: string; name: string }
type Category = { id: string; name: string }

export default function AdminPage() {
  const { setDrawer } = useDrawer()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editingClientName, setEditingClientName] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleAllowedOn, setEditingRoleAllowedOn] = useState<AllowedOnValue[]>(DEFAULT_ALLOWED_ON)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleAllowedOn, setNewRoleAllowedOn] = useState<AllowedOnValue[]>(DEFAULT_ALLOWED_ON)
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null)
  const [editingSectorName, setEditingSectorName] = useState('')
  const [newSectorName, setNewSectorName] = useState('')
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingSkillName, setEditingSkillName] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [empDeleteConfirm, setEmpDeleteConfirm] = useState<{ id: string; name: string; assignmentCount: number } | null>(null)

  const loadEmployees = useCallback(() => {
    fetch('/api/employees?limit=200&depth=1&sort=name').then(r => r.json()).then(d => {
      setEmployees((d.docs ?? []).map((e: {
        id: string; name: string; jobTitle?: string;
        manager?: { name: string } | string; maximumHours: number; baseHourlyRate?: number; color?: string
      }) => ({
        id: e.id,
        name: e.name,
        jobTitle: e.jobTitle ?? null,
        managerName: e.manager && typeof e.manager === 'object' ? e.manager.name : null,
        capacity: e.maximumHours,
        baseHourlyRate: e.baseHourlyRate ?? null,
        color: e.color ?? null,
      })))
    })
  }, [])

  const loadClients = useCallback(() => {
    fetch('/api/clients?limit=200&sort=name').then(r => r.json()).then(d => setClients(d.docs ?? []))
  }, [])

  const loadRoles = useCallback(() => {
    fetch('/api/roles?limit=200&sort=name').then(r => r.json()).then(d => {
      setRoles((d.docs ?? []).map((r: { id: string; name: string; allowedOn?: AllowedOnValue[] | null }) => ({
        id: r.id,
        name: r.name,
        allowedOn: r.allowedOn ?? DEFAULT_ALLOWED_ON,
      })))
    })
  }, [])

  const loadSectors = useCallback(() => {
    fetch('/api/sectors?limit=200&sort=name').then(r => r.json()).then(d => setSectors(d.docs ?? []))
  }, [])

  const loadSkills = useCallback(() => {
    fetch('/api/skills?limit=200&sort=name').then(r => r.json()).then(d => setSkills(d.docs ?? []))
  }, [])

  const loadCategories = useCallback(() => {
    fetch('/api/internal-work-categories?limit=200&sort=name').then(r => r.json()).then(d => setCategories(d.docs ?? []))
  }, [])

  useEffect(() => {
    loadEmployees()
    loadClients()
    loadRoles()
    loadSectors()
    loadSkills()
    loadCategories()
  }, [loadEmployees, loadClients, loadRoles, loadSectors, loadSkills, loadCategories])

  function openAddEmployee() {
    setDrawer({ component: EmployeeForm, componentProps: { onSave: loadEmployees } })
  }

  function openEditEmployee(id: string) {
    setDrawer({ component: EmployeeForm, componentProps: { employeeId: id, onSave: loadEmployees } })
  }

  async function requestDeleteEmployee(id: string, name: string) {
    const data = await fetch(`/api/assignments?employeeId=${id}`).then(r => r.json())
    setEmpDeleteConfirm({ id, name, assignmentCount: data.totalDocs ?? 0 })
  }

  async function confirmDeleteEmployee() {
    if (!empDeleteConfirm) return
    const res = await fetch(`/api/admin-employees/${empDeleteConfirm.id}?force=true`, { method: 'DELETE' })
    setEmpDeleteConfirm(null)
    if (!res.ok) {
      alert('Failed to delete employee.')
      return
    }
    loadEmployees()
  }

  // Clients CRUD
  async function saveClient(id: string) {
    if (!editingClientName.trim()) return
    await fetch(`/api/admin-clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingClientName.trim() }),
    })
    setEditingClientId(null)
    loadClients()
  }

  async function deleteClient(id: string) {
    const res = await fetch(`/api/admin-clients/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot delete')
      return
    }
    loadClients()
  }

  async function addClient() {
    if (!newClientName.trim()) return
    await fetch('/api/admin-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName.trim() }),
    })
    setNewClientName('')
    loadClients()
  }

  // Roles CRUD
  async function saveRole(id: string) {
    if (!editingRoleName.trim()) return
    if (editingRoleAllowedOn.length === 0) {
      alert('At least one work item type must be selected.')
      return
    }

    const doSave = async (force: boolean) => fetch(`/api/admin-roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingRoleName.trim(), allowedOn: editingRoleAllowedOn, force }),
    })

    let res = await doSave(false)

    if (res.status === 409) {
      const data = await res.json()
      if (data.conflict) {
        const total = (data.conflicts as { type: string; count: number }[]).reduce((s, c) => s + c.count, 0)
        const detail = (data.conflicts as { type: string; count: number }[])
          .map(c => `${c.count} on ${TYPE_LABELS[c.type] ?? c.type}`)
          .join(', ')
        const ok = window.confirm(
          `${total} assignment${total !== 1 ? 's' : ''} will be removed (${detail}) because those work item types are no longer allowed for this role. Are you sure?`
        )
        if (!ok) return
        res = await doSave(true)
      } else {
        alert(data.error ?? 'Cannot save')
        return
      }
    }

    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot save')
      return
    }

    setEditingRoleId(null)
    loadRoles()
  }

  async function deleteRole(id: string) {
    const doDelete = (force: boolean) =>
      fetch(`/api/admin-roles/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' })

    let res = await doDelete(false)

    if (res.status === 409) {
      const data = await res.json()
      if (data.conflict) {
        const n = data.totalAssignments as number
        const ok = window.confirm(
          `${n} assignment${n !== 1 ? 's' : ''} use this role and will be removed along with it. Are you sure?`
        )
        if (!ok) return
        res = await doDelete(true)
      } else {
        alert(data.error ?? 'Cannot delete')
        return
      }
    }

    if (!res.ok) {
      alert('Failed to delete role.')
      return
    }
    loadRoles()
  }

  async function addRole() {
    if (!newRoleName.trim()) return
    if (newRoleAllowedOn.length === 0) {
      alert('At least one work item type must be selected.')
      return
    }
    const res = await fetch('/api/admin-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName.trim(), allowedOn: newRoleAllowedOn }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot create')
      return
    }
    setNewRoleName('')
    setNewRoleAllowedOn(DEFAULT_ALLOWED_ON)
    loadRoles()
  }

  function toggleAllowedOn(
    value: AllowedOnValue,
    current: AllowedOnValue[],
    set: (v: AllowedOnValue[]) => void,
  ) {
    set(current.includes(value) ? current.filter(v => v !== value) : [...current, value])
  }

  // Sectors CRUD
  async function saveSector(id: string) {
    if (!editingSectorName.trim()) return
    await fetch(`/api/admin-sectors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingSectorName.trim() }),
    })
    setEditingSectorId(null)
    loadSectors()
  }

  async function deleteSector(id: string) {
    const res = await fetch(`/api/admin-sectors/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot delete')
      return
    }
    loadSectors()
  }

  async function addSector() {
    if (!newSectorName.trim()) return
    await fetch('/api/admin-sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSectorName.trim() }),
    })
    setNewSectorName('')
    loadSectors()
  }

  // Skills CRUD
  async function saveSkill(id: string) {
    if (!editingSkillName.trim()) return
    await fetch(`/api/admin-skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingSkillName.trim() }),
    })
    setEditingSkillId(null)
    loadSkills()
  }

  async function deleteSkill(id: string) {
    const res = await fetch(`/api/admin-skills/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot delete')
      return
    }
    loadSkills()
  }

  async function addSkill() {
    if (!newSkillName.trim()) return
    await fetch('/api/admin-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSkillName.trim() }),
    })
    setNewSkillName('')
    loadSkills()
  }

  // Internal Work Categories CRUD
  async function saveCategory(id: string) {
    if (!editingCategoryName.trim()) return
    const res = await fetch(`/api/admin-internal-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingCategoryName.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot save')
      return
    }
    setEditingCategoryId(null)
    loadCategories()
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/admin-internal-categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot delete')
      return
    }
    loadCategories()
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return
    const res = await fetch('/api/admin-internal-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot create')
      return
    }
    setNewCategoryName('')
    loadCategories()
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Admin</h2>

      {/* Employees Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Staff</h3>
          <button type="button" className={styles.addBtn} onClick={openAddEmployee}>+ ADD EMPLOYEE</button>
        </div>
        <div className={styles.list}>
          {employees.map(emp => {
            const isConfirming = empDeleteConfirm?.id === emp.id
            return (
              <div key={emp.id} className={styles.listRow} data-confirming={isConfirming ? 'true' : undefined}>
                <span
                  className={styles.empDot}
                  style={{ background: emp.color ?? '#9a9484' }}
                >
                  {getInitials(emp.name)}
                </span>
                <div className={styles.empInfo}>
                  <span className={styles.empName}>{emp.name}</span>
                  {emp.jobTitle && <span className={styles.empMeta}>{emp.jobTitle}</span>}
                  {emp.managerName && <span className={styles.empMeta}>Manager: {emp.managerName}</span>}
                </div>
                {isConfirming ? (
                  <div className={styles.deleteConfirm}>
                    <span className={styles.deleteConfirmText}>
                      Remove {empDeleteConfirm.name}?
                      {empDeleteConfirm.assignmentCount > 0 && (
                        <> {empDeleteConfirm.assignmentCount} assignment{empDeleteConfirm.assignmentCount !== 1 ? 's' : ''} will also be removed.</>
                      )}
                    </span>
                    <button type="button" className={styles.confirmDeleteBtn} onClick={confirmDeleteEmployee}>CONFIRM</button>
                    <button type="button" className={styles.cancelBtn} onClick={() => setEmpDeleteConfirm(null)}>CANCEL</button>
                  </div>
                ) : (
                  <>
                    <span className={styles.empCapacity}>{emp.capacity} hrs/wk</span>
                    {emp.baseHourlyRate != null && (
                      <span className={styles.empRate}>${emp.baseHourlyRate.toLocaleString('en-US')}/hr</span>
                    )}
                    <button type="button" className={styles.editBtn} onClick={() => openEditEmployee(emp.id)}>EDIT</button>
                    <button type="button" className={styles.deleteBtn} onClick={() => requestDeleteEmployee(emp.id, emp.name)}>DELETE</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Roles Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Roles</h3>
        <div className={styles.list}>
          {roles.map(role => (
            <div key={role.id} className={styles.listRow} data-editing={editingRoleId === role.id ? 'true' : undefined}>
              {editingRoleId === role.id ? (
                <div className={styles.roleEditBlock}>
                  <div className={styles.roleEditTop}>
                    <input
                      type="text"
                      className={styles.inlineInput}
                      value={editingRoleName}
                      onChange={e => setEditingRoleName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingRoleId(null) }}
                      autoFocus
                    />
                    <button type="button" className={styles.saveBtn} onClick={() => saveRole(role.id)}>SAVE</button>
                    <button type="button" className={styles.cancelBtn} onClick={() => setEditingRoleId(null)}>CANCEL</button>
                  </div>
                  <div className={styles.allowedOnRow}>
                    <span className={styles.allowedOnLabel}>ALLOWED ON</span>
                    {ALLOWED_ON_OPTIONS.map(opt => (
                      <label key={opt.value} className={styles.allowedOnCheck}>
                        <input
                          type="checkbox"
                          checked={editingRoleAllowedOn.includes(opt.value)}
                          onChange={() => toggleAllowedOn(opt.value, editingRoleAllowedOn, setEditingRoleAllowedOn)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.itemName}>{role.name}</span>
                  <div className={styles.roleTags}>
                    {role.allowedOn.map(t => (
                      <span key={t} className={styles.roleTag}>
                        {ALLOWED_ON_OPTIONS.find(o => o.value === t)?.label}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => { setEditingRoleId(role.id); setEditingRoleName(role.name); setEditingRoleAllowedOn(role.allowedOn) }}
                  >
                    EDIT
                  </button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteRole(role.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addBlock}>
          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.inlineInput}
              placeholder="New role name…"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRole() }}
            />
            <button type="button" className={styles.addBtn} onClick={addRole} disabled={!newRoleName.trim() || newRoleAllowedOn.length === 0}>ADD</button>
          </div>
          <div className={styles.allowedOnRow}>
            <span className={styles.allowedOnLabel}>ALLOWED ON</span>
            {ALLOWED_ON_OPTIONS.map(opt => (
              <label key={opt.value} className={styles.allowedOnCheck}>
                <input
                  type="checkbox"
                  checked={newRoleAllowedOn.includes(opt.value)}
                  onChange={() => toggleAllowedOn(opt.value, newRoleAllowedOn, setNewRoleAllowedOn)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Work Categories Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Internal Work Categories</h3>
        <div className={styles.list}>
          {categories.map(cat => (
            <div key={cat.id} className={styles.listRow}>
              {editingCategoryId === cat.id ? (
                <>
                  <input
                    type="text"
                    className={styles.inlineInput}
                    value={editingCategoryName}
                    onChange={e => setEditingCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCategory(cat.id); if (e.key === 'Escape') setEditingCategoryId(null) }}
                    autoFocus
                  />
                  <button type="button" className={styles.saveBtn} onClick={() => saveCategory(cat.id)}>SAVE</button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingCategoryId(null)}>CANCEL</button>
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{cat.name}</span>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name) }}>EDIT</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteCategory(cat.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="New category name…"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
          />
          <button type="button" className={styles.addBtn} onClick={addCategory} disabled={!newCategoryName.trim()}>ADD</button>
        </div>
      </section>

      {/* Clients Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Clients</h3>
        <div className={styles.list}>
          {clients.map(client => (
            <div key={client.id} className={styles.listRow}>
              {editingClientId === client.id ? (
                <>
                  <input
                    type="text"
                    className={styles.inlineInput}
                    value={editingClientName}
                    onChange={e => setEditingClientName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveClient(client.id); if (e.key === 'Escape') setEditingClientId(null) }}
                    autoFocus
                  />
                  <button type="button" className={styles.saveBtn} onClick={() => saveClient(client.id)}>SAVE</button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingClientId(null)}>CANCEL</button>
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{client.name}</span>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingClientId(client.id); setEditingClientName(client.name) }}>EDIT</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteClient(client.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="New client name…"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addClient() }}
          />
          <button type="button" className={styles.addBtn} onClick={addClient} disabled={!newClientName.trim()}>ADD</button>
        </div>
      </section>

      {/* Skills Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Skills</h3>
        <div className={styles.list}>
          {skills.map(skill => (
            <div key={skill.id} className={styles.listRow}>
              {editingSkillId === skill.id ? (
                <>
                  <input
                    type="text"
                    className={styles.inlineInput}
                    value={editingSkillName}
                    onChange={e => setEditingSkillName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSkill(skill.id); if (e.key === 'Escape') setEditingSkillId(null) }}
                    autoFocus
                  />
                  <button type="button" className={styles.saveBtn} onClick={() => saveSkill(skill.id)}>SAVE</button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingSkillId(null)}>CANCEL</button>
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{skill.name}</span>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingSkillId(skill.id); setEditingSkillName(skill.name) }}>EDIT</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteSkill(skill.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="New skill name…"
            value={newSkillName}
            onChange={e => setNewSkillName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSkill() }}
          />
          <button type="button" className={styles.addBtn} onClick={addSkill} disabled={!newSkillName.trim()}>ADD</button>
        </div>
      </section>

      {/* Sectors Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Sectors</h3>
        <div className={styles.list}>
          {sectors.map(sector => (
            <div key={sector.id} className={styles.listRow}>
              {editingSectorId === sector.id ? (
                <>
                  <input
                    type="text"
                    className={styles.inlineInput}
                    value={editingSectorName}
                    onChange={e => setEditingSectorName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSector(sector.id); if (e.key === 'Escape') setEditingSectorId(null) }}
                    autoFocus
                  />
                  <button type="button" className={styles.saveBtn} onClick={() => saveSector(sector.id)}>SAVE</button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingSectorId(null)}>CANCEL</button>
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{sector.name}</span>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingSectorId(sector.id); setEditingSectorName(sector.name) }}>EDIT</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteSector(sector.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="New sector name…"
            value={newSectorName}
            onChange={e => setNewSectorName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSector() }}
          />
          <button type="button" className={styles.addBtn} onClick={addSector} disabled={!newSectorName.trim()}>ADD</button>
        </div>
      </section>
    </div>
  )
}
