import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee } from '@/payload-types'
import EmployeeGrid from '@/components/EmployeeGrid/EmployeeGrid'
import type { AssignmentForUtil } from '@/lib/utilization'

type EmployeeGridData = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  capacity: number
  assignments: AssignmentForUtil[]
}

export default async function EmployeesPage() {
  const payload = await getPayload({ config: await config })

  const [{ docs: employees }, { docs: allAssignments }] = await Promise.all([
    payload.find({ collection: 'employees', limit: 200, overrideAccess: true }),
    payload.find({ collection: 'assignments', depth: 1, limit: 10000, overrideAccess: true }),
  ])

  const empAssignments: Record<string, AssignmentForUtil[]> = {}
  for (const assignment of allAssignments) {
    const emp = assignment.employee
    if (typeof emp !== 'object') continue
    const wv = assignment.workItem.value
    if (typeof wv !== 'object') continue
    const wItem = wv as { startDate?: string; endDate?: string }
    if (!wItem.startDate || !wItem.endDate) continue
    if (!empAssignments[emp.id]) empAssignments[emp.id] = []
    empAssignments[emp.id].push({ hours: assignment.hours, startDate: wItem.startDate, endDate: wItem.endDate })
  }

  const employeeData: EmployeeGridData[] = employees.map((emp: Employee) => ({
    id: emp.id,
    name: emp.name,
    color: emp.color ?? null,
    jobTitle: emp.jobTitle ?? null,
    capacity: emp.maximumHours ?? 40,
    assignments: empAssignments[emp.id] ?? [],
  }))

  return <EmployeeGrid employees={employeeData} />
}
