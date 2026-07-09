import Link from 'next/link'
import styles from './ProjectCard.module.scss'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'

type EmployeeChip = {
  id: string
  name: string
  color: string | null
  totalHours: number
  utilPct: number
}

type ProjectCardProps = {
  id: string
  name: string
  sectorName: string | null
  dateRange: string
  phaseCount: number
  teamSize: number
  totalHours: number
  budget: number | null
  employeeChips: EmployeeChip[]
}

export default function ProjectCard(props: ProjectCardProps) {
  return (
    <Link href={`/projects/${props.id}`} className={styles.root}>
      <div className={styles.header}>
        <span className={styles.name}>{props.name}</span>
        {props.sectorName && (
          <span className={styles.sector}>{props.sectorName}</span>
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>{props.dateRange}</span>
        <span className={styles.metaItem}>{props.phaseCount} {props.phaseCount === 1 ? 'phase' : 'phases'}</span>
        <span className={styles.metaItem}>{props.teamSize} on team</span>
        {props.budget != null && (
          <span className={styles.metaItem}>${props.budget.toLocaleString('en-US')} budget</span>
        )}
      </div>
      <div className={styles.hoursSection}>
        <div className={styles.hoursHeader}>
          <span className={styles.hoursLabel}>TOTAL HOURS ASSIGNED</span>
          <span className={styles.hoursTotal}>{props.totalHours} hrs</span>
        </div>
        {props.employeeChips.length > 0 && (
          <div className={styles.chips}>
            {props.employeeChips.map(chip => (
              <span key={chip.id} className={styles.chip}>
                <UtilizationRing
                  size="xs"
                  pct={chip.utilPct}
                  name={chip.name}
                  avatarColor={chip.color ?? '#9a9484'}
                  windowWeeks={4}
                />
                <span className={styles.chipName}>{chip.name}</span>
                <span className={styles.chipHours}>{chip.totalHours}h</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
