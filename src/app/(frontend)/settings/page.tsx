'use client'

import { useState, useEffect, useCallback } from 'react'
import EmployeeForm from '@/components/EmployeeForm/EmployeeForm'
import { useDrawer } from '@/context/DrawerContext'
import { getInitials } from '@/lib/dateUtils'
import styles from './page.module.scss'

type Employee = {
  id: string
  name: string
  jobTitle: string | null
  managerName: string | null
  capacity: number
  color: string | null
}

type Client = { id: string; name: string }
type Role = { id: string; name: string }
type Sector = { id: string; name: string }
type Skill = { id: string; name: string }

export default function AdminPage() {
  const { setDrawer } = useDrawer()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editingClientName, setEditingClientName] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null)
  const [editingSectorName, setEditingSectorName] = useState('')
  const [newSectorName, setNewSectorName] = useState('')
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingSkillName, setEditingSkillName] = useState('')
  const [newSkillName, setNewSkillName] = useState('')

  const loadEmployees = useCallback(() => {
    fetch('/api/employees?limit=200&depth=1').then(r => r.json()).then(d => {
      setEmployees((d.docs ?? []).map((e: {
        id: string; name: string; jobTitle?: string;
        manager?: { name: string } | string; maximumHours: number; color?: string
      }) => ({
        id: e.id,
        name: e.name,
        jobTitle: e.jobTitle ?? null,
        managerName: e.manager && typeof e.manager === 'object' ? e.manager.name : null,
        capacity: e.maximumHours,
        color: e.color ?? null,
      })))
    })
  }, [])

  const loadClients = useCallback(() => {
    fetch('/api/clients?limit=200').then(r => r.json()).then(d => setClients(d.docs ?? []))
  }, [])

  const loadRoles = useCallback(() => {
    fetch('/api/roles?limit=200').then(r => r.json()).then(d => setRoles(d.docs ?? []))
  }, [])

  const loadSectors = useCallback(() => {
    fetch('/api/sectors?limit=200').then(r => r.json()).then(d => setSectors(d.docs ?? []))
  }, [])

  const loadSkills = useCallback(() => {
    fetch('/api/skills?limit=200').then(r => r.json()).then(d => setSkills(d.docs ?? []))
  }, [])

  useEffect(() => {
    loadEmployees()
    loadClients()
    loadRoles()
    loadSectors()
    loadSkills()
  }, [loadEmployees, loadClients, loadRoles, loadSectors, loadSkills])

  function openAddEmployee() {
    setDrawer({ component: EmployeeForm, componentProps: { onSave: loadEmployees } })
  }

  function openEditEmployee(id: string) {
    setDrawer({ component: EmployeeForm, componentProps: { employeeId: id, onSave: loadEmployees } })
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
    const res = await fetch(`/api/admin-roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingRoleName.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot save')
      return
    }
    setEditingRoleId(null)
    loadRoles()
  }

  async function deleteRole(id: string) {
    const res = await fetch(`/api/admin-roles/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot delete')
      return
    }
    loadRoles()
  }

  async function addRole() {
    if (!newRoleName.trim()) return
    const res = await fetch('/api/admin-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Cannot create')
      return
    }
    setNewRoleName('')
    loadRoles()
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

  return (
    <div className={styles.root}>
      <h2 className={styles.pageTitle}>Admin</h2>

      {/* Employees Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Employees</h3>
          <button type="button" className={styles.addBtn} onClick={openAddEmployee}>+ ADD EMPLOYEE</button>
        </div>
        <div className={styles.list}>
          {employees.map(emp => (
            <div key={emp.id} className={styles.listRow}>
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
              <span className={styles.empCapacity}>{emp.capacity} hrs/wk</span>
              <button type="button" className={styles.editBtn} onClick={() => openEditEmployee(emp.id)}>EDIT</button>
            </div>
          ))}
        </div>
      </section>

      {/* Roles Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Roles</h3>
        <div className={styles.list}>
          {roles.map(role => (
            <div key={role.id} className={styles.listRow}>
              {editingRoleId === role.id ? (
                <>
                  <input
                    type="text"
                    className={styles.inlineInput}
                    value={editingRoleName}
                    onChange={e => setEditingRoleName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRole(role.id); if (e.key === 'Escape') setEditingRoleId(null) }}
                    autoFocus
                  />
                  <button type="button" className={styles.saveBtn} onClick={() => saveRole(role.id)}>SAVE</button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingRoleId(null)}>CANCEL</button>
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{role.name}</span>
                  <button type="button" className={styles.editBtn} onClick={() => { setEditingRoleId(role.id); setEditingRoleName(role.name) }}>EDIT</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => deleteRole(role.id)}>DELETE</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="New role name…"
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addRole() }}
          />
          <button type="button" className={styles.addBtn} onClick={addRole} disabled={!newRoleName.trim()}>ADD</button>
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
