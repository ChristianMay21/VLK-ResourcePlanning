'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import { rollingUtilizationPct, utilizationColor, weeklySchedule, type AssignmentForUtil } from '@/lib/utilization'
import { useDrawer } from '@/context/DrawerContext'
import styles from './EmployeeDetail.module.scss'

type EmployeeDetailProps = {
  employeeId: string
}

type EmployeeData = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  capacity: number
  managerId: string | null
  managerName: string | null
}

type WorkEntry = {
  id: string
  type: 'project' | 'phase' | 'task'
  name: string
  roleName: string
  hours: number
}

type AssignedProject = {
  projectId: string
  projectName: string
  items: WorkEntry[]
}

type DetailData = {
  employee: EmployeeData
  assignmentsForUtil: AssignmentForUtil[]
  assignedWork: AssignedProject[]
}

const WINDOW_OPTIONS = [4, 8, 12] as const

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatWeekLabel(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`
}

// Capacity line sits at 80% of chart height; bar at 100% load aligns with it
const CAPACITY_LINE_PCT = 80

export default function EmployeeDetail(props: EmployeeDetailProps) {
  const { setDrawer } = useDrawer()
  const [data, setData] = useState<DetailData | null>(null)
  const [windowWeeks, setWindowWeeks] = useState<4 | 8 | 12>(4)

  useEffect(() => {
    setData(null)
    fetch(`/api/employee-detail?id=${props.employeeId}`)
      .then(r => r.json())
      .then(setData)
  }, [props.employeeId])

  if (!data) {
    return <div className={styles.loading}>Loading…</div>
  }

  const { employee, assignmentsForUtil, assignedWork } = data
  const today = new Date()
  const utilPct = rollingUtilizationPct(assignmentsForUtil, employee.capacity, windowWeeks, today)
  const schedule = weeklySchedule(assignmentsForUtil, windowWeeks, today)

  const barHeightPct = (hours: number) =>
    Math.min((hours / employee.capacity) * CAPACITY_LINE_PCT, 100)

  function openManagerDrawer() {
    if (!employee.managerId) return
    // EmployeeDetail references itself by name — valid self-recursion
    setDrawer({ component: EmployeeDetail, componentProps: { employeeId: employee.managerId } })
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <UtilizationRing
          size="lg"
          pct={utilPct}
          name={employee.name}
          avatarColor={employee.color ?? '#9a9484'}
          windowWeeks={windowWeeks}
        />
        <div className={styles.identity}>
          <h2 className={styles.name}>{employee.name}</h2>
          {employee.jobTitle && <div className={styles.jobTitle}>{employee.jobTitle}</div>}
          <div className={styles.capacity}>{employee.capacity} hrs/week capacity</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>MANAGER</div>
        {employee.managerId ? (
          <button type="button" className={styles.managerLink} onClick={openManagerDrawer}>
            {employee.managerName}
          </button>
        ) : (
          <span className={styles.managerNone}>Top of reporting chain</span>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.scheduleHeader}>
          <div className={styles.sectionLabel}>SCHEDULE LOAD</div>
          <div className={styles.windowSelector}>
            {WINDOW_OPTIONS.map(w => (
              <button
                key={w}
                type="button"
                className={styles.windowBtn}
                data-active={w === windowWeeks ? 'true' : undefined}
                onClick={() => setWindowWeeks(w)}
              >
                {w}W
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chart}>
          <div className={styles.capacityLine} />
          {schedule.map((week, i) => (
            <div key={i} className={styles.barCol}>
              <div
                className={styles.bar}
                style={{
                  height: `${barHeightPct(week.hours)}%`,
                  background: utilizationColor(week.hours / employee.capacity * 100),
                }}
              />
              <div className={styles.barLabel}>{formatWeekLabel(week.weekStart)}</div>
            </div>
          ))}
        </div>

        <div className={styles.chartLegend}>
          <span>NEXT {windowWeeks} WEEKS · AVG: {Math.round(utilPct)}% UTILIZED</span>
          <span className={styles.legendDash}>— — = {employee.capacity} HRS/WEEK</span>
        </div>
      </div>

      {assignedWork.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>ASSIGNED WORK</div>
          {assignedWork.map(proj => (
            <div key={proj.projectId} className={styles.projectGroup}>
              <Link href={`/projects/${proj.projectId}`} className={styles.projectName}>
                {proj.projectName}
              </Link>
              {proj.items.map(item => (
                <div key={`${item.type}-${item.id}`} className={styles.workItem} data-type={item.type}>
                  <span className={styles.workItemName}>{item.name}</span>
                  <span className={styles.workItemMeta}>
                    {item.roleName && <span className={styles.workItemRole}>{item.roleName}</span>}
                    <span className={styles.workItemHours}>{item.hours}h</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
