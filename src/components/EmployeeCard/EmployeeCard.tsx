'use client'

import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import { rollingUtilizationSplit, utilizationColor, type AssignmentForUtil } from '@/lib/utilization'
import { useDrawer } from '@/context/DrawerContext'
import styles from './EmployeeCard.module.scss'

type EmployeeCardProps = {
  id: string
  name: string
  color: string | null
  jobTitle: string | null
  capacity: number
  baseHourlyRate: number | null
  assignments: AssignmentForUtil[]
  windowWeeks: 4 | 8 | 12
}

export default function EmployeeCard(props: EmployeeCardProps) {
  const { setDrawer } = useDrawer()
  const split = rollingUtilizationSplit(props.assignments, props.capacity, props.windowWeeks, new Date())
  const totalPct = split.totalPct
  const color = utilizationColor(totalPct)
  const pctRounded = Math.round(totalPct)

  function handleClick() {
    setDrawer({ component: EmployeeDetail, componentProps: { employeeId: props.id } })
  }

  return (
    <button type="button" className={styles.root} onClick={handleClick}>
      <UtilizationRing
        size="md"
        pct={totalPct}
        billablePct={split.billablePct}
        internalPct={split.internalPct}
        name={props.name}
        avatarColor={props.color ?? '#9a9484'}
        windowWeeks={props.windowWeeks}
      />
      <div className={styles.name}>{props.name}</div>
      {props.jobTitle && <div className={styles.jobTitle}>{props.jobTitle}</div>}
      <div className={styles.utilRow}>
        <span className={styles.utilPct} style={{ color }}>{pctRounded}%</span>
        <span className={styles.utilLabel}>UTILIZED</span>
      </div>
      <div className={styles.utilBarTrack}>
        <div
          className={styles.utilBarFill}
          style={{ width: `${Math.min(totalPct, 100)}%`, background: color }}
        />
      </div>
      {props.baseHourlyRate != null && (
        <div className={styles.rate}>${props.baseHourlyRate.toLocaleString('en-US')}/hr</div>
      )}
    </button>
  )
}
