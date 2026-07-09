'use client'

import { useState } from 'react'
import EmployeeCard from '@/components/EmployeeCard/EmployeeCard'
import TeamTimeline from '@/components/TeamTimeline/TeamTimeline'
import type { TimelineEntry, TimelineEmployee } from '@/components/TeamTimeline/TeamTimeline'
import type { AssignmentForUtil } from '@/lib/utilization'
import styles from './EmployeeGrid.module.scss'

type EmployeeData = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  capacity: number
  baseHourlyRate: number | null
  assignments: AssignmentForUtil[]
}

type EmployeeGridProps = {
  employees: EmployeeData[]
  timelineEntries: TimelineEntry[]
}

const WINDOW_OPTIONS = [4, 8, 12] as const

export default function EmployeeGrid(props: EmployeeGridProps) {
  const [windowWeeks, setWindowWeeks] = useState<4 | 8 | 12>(4)

  const timelineEmployees: TimelineEmployee[] = props.employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    color: emp.color,
    capacity: emp.capacity,
  }))

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Staff</h2>
        <div className={styles.windowSelector}>
          <span className={styles.windowLabel}>WINDOW</span>
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
      <div className={styles.grid}>
        {props.employees.map(emp => (
          <EmployeeCard
            key={emp.id}
            id={emp.id}
            name={emp.name}
            color={emp.color}
            jobTitle={emp.jobTitle}
            capacity={emp.capacity}
            baseHourlyRate={emp.baseHourlyRate}
            assignments={emp.assignments}
            windowWeeks={windowWeeks}
          />
        ))}
      </div>
      <TeamTimeline
        windowWeeks={windowWeeks}
        employees={timelineEmployees}
        timelineEntries={props.timelineEntries}
      />
    </div>
  )
}
