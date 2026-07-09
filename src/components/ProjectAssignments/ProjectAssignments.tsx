'use client'

import { useEffect, useState } from 'react'
import styles from './ProjectAssignments.module.scss'

type Role = {
  id: string
  name: string
}

type Employee = {
  id: string
  name: string
}

type Assignment = {
  id: string
  role: Role
  employee: Employee
  allocatedHours: number
}

type FormState = {
  roleId: string
  employeeId: string
  allocatedHours: number
  editingId: string | null
}

type ProjectAssignmentsProps = {
  projectId: string
}

export default function ProjectAssignments(props: ProjectAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState<FormState | null>(null)

  async function loadAssignments() {
    const res = await fetch(`/api/project-assignments?projectId=${props.projectId}`)
    const data = await res.json()
    setAssignments(data)
  }

  useEffect(() => {
    async function init() {
      const [rolesRes, employeesRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/employees'),
      ])
      setRoles(await rolesRes.json())
      setEmployees(await employeesRes.json())
      await loadAssignments()
    }
    init()
  }, [props.projectId])

  function openCreate() {
    setForm({
      roleId: roles[0]?.id ?? '',
      employeeId: employees[0]?.id ?? '',
      allocatedHours: 40,
      editingId: null,
    })
  }

  function openEdit(assignment: Assignment) {
    setForm({
      roleId: assignment.role.id,
      employeeId: assignment.employee.id,
      allocatedHours: assignment.allocatedHours,
      editingId: assignment.id,
    })
  }

  async function handleSave() {
    if (!form) return

    if (form.editingId) {
      await fetch(`/api/project-assignments/${form.editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: form.roleId,
          employeeId: form.employeeId,
          allocatedHours: form.allocatedHours,
        }),
      })
    } else {
      await fetch('/api/project-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: props.projectId,
          roleId: form.roleId,
          employeeId: form.employeeId,
          allocatedHours: form.allocatedHours,
        }),
      })
    }

    setForm(null)
    await loadAssignments()
  }

  async function handleDelete(assignmentId: string) {
    await fetch(`/api/project-assignments/${assignmentId}?projectId=${props.projectId}`, {
      method: 'DELETE',
    })
    await loadAssignments()
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Assignments</h3>
        {!form && (
          <button className={styles.addButton} onClick={openCreate}>+ Add</button>
        )}
      </div>

      {assignments.length === 0 && !form && (
        <p className={styles.empty}>No assignments yet.</p>
      )}

      {assignments.length > 0 && (
        <div className={styles.list}>
          {assignments.map(assignment => (
            <div key={assignment.id} className={styles.row}>
              <span className={styles.role}>{assignment.role.name}</span>
              <span className={styles.employee}>{assignment.employee.name}</span>
              <span className={styles.hours}>{assignment.allocatedHours}h</span>
              <div className={styles.actions}>
                <button className={styles.actionButton} onClick={() => openEdit(assignment)}>Edit</button>
                <button className={styles.actionButton} data-variant="danger" onClick={() => handleDelete(assignment.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Role</label>
            <select
              className={styles.select}
              value={form.roleId}
              onChange={e => setForm({ ...form, roleId: e.target.value })}
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Employee</label>
            <select
              className={styles.select}
              value={form.employeeId}
              onChange={e => setForm({ ...form, employeeId: e.target.value })}
            >
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Allocated Hours</label>
            <input
              className={styles.input}
              type="number"
              value={form.allocatedHours}
              onChange={e => setForm({ ...form, allocatedHours: Number(e.target.value) })}
            />
          </div>
          <div className={styles.formActions}>
            <button className={styles.saveButton} onClick={handleSave}>Save</button>
            <button className={styles.cancelButton} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
