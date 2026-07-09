import styles from './ProjectGantt.module.scss'
import { parseDate, daysBetween } from '@/lib/dateUtils'

type GanttBar = {
  id: string
  label: string
  type: 'phase' | 'task'
  status: 'upcoming' | 'active' | 'complete'
  startDate: string
  endDate: string
  highlightId?: string
}

type ProjectGanttProps = {
  projectStartDate: string
  projectEndDate: string
  bars: GanttBar[]
  highlightId?: string
  compact?: boolean
}

const STATUS_COLORS = {
  upcoming: '#9a9484',
  active: '#2c4a6e',
  complete: '#4a7c59',
}

const LEGEND = [
  { label: 'To Do', color: '#9a9484' },
  { label: 'In Progress', color: '#2c4a6e' },
  { label: 'Complete', color: '#4a7c59' },
]

function getMonthMarkers(startStr: string, endStr: string) {
  const start = parseDate(startStr)
  const end = parseDate(endStr)
  const total = Math.max(daysBetween(start, end), 1)

  const markers: { label: string; leftPct: number }[] = []
  // Start from the first day of the month after project start (or same month if on the 1st)
  let d = new Date(start.getFullYear(), start.getMonth(), 1)
  if (d.getTime() < start.getTime()) {
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }

  while (d <= end) {
    const leftPct = (daysBetween(start, d) / total) * 100
    markers.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      leftPct,
    })
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  return markers
}

export default function ProjectGantt(props: ProjectGanttProps) {
  const start = parseDate(props.projectStartDate)
  const end = parseDate(props.projectEndDate)
  const totalDays = Math.max(daysBetween(start, end), 1)
  const labelWidth = props.compact ? 120 : 180
  const months = getMonthMarkers(props.projectStartDate, props.projectEndDate)

  function barStyle(bar: GanttBar) {
    const barStart = parseDate(bar.startDate)
    const barEnd = parseDate(bar.endDate)
    const left = Math.max(0, (daysBetween(start, barStart) / totalDays) * 100)
    const width = Math.min(100 - left, Math.max(0.5, (daysBetween(barStart, barEnd) / totalDays) * 100))
    const isPhase = bar.type === 'phase'
    const isHighlighted = props.highlightId === bar.id

    let bg = STATUS_COLORS[bar.status]
    if (!isPhase) bg = 'rgba(44, 74, 110, 0.25)'
    if (isHighlighted) bg = STATUS_COLORS[bar.status]

    const barHeight = isPhase ? 18 : 12
    const barTop = isPhase ? 4 : 3
    const border = isHighlighted ? `2px solid ${STATUS_COLORS[bar.status]}` : 'none'

    return { left, width, bg, barHeight, barTop, border }
  }

  return (
    <div className={styles.root}>
      <div className={styles.label}>PROJECT TIMELINE</div>
      <div className={styles.ruler} style={{ paddingLeft: labelWidth }}>
        {months.map((m, i) => (
          <span
            key={i}
            className={styles.monthLabel}
            style={{ left: `calc(${labelWidth}px + ${m.leftPct}%)` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className={styles.rows}>
        {props.bars.map(bar => {
          const { left, width, bg, barHeight, barTop, border } = barStyle(bar)
          const rowHeight = bar.type === 'phase' ? 26 : 18
          return (
            <div key={bar.id} className={styles.row} style={{ height: rowHeight }}>
              <div
                className={styles.rowLabel}
                style={{
                  width: labelWidth,
                  fontSize: bar.type === 'phase' ? 13 : 11,
                  fontWeight: bar.type === 'phase' ? 500 : 400,
                  color: props.highlightId === bar.id ? '#211f1a' : bar.type === 'phase' ? '#211f1a' : '#6b6558',
                }}
              >
                {bar.label}
              </div>
              <div className={styles.timeline}>
                <div
                  className={styles.bar}
                  title={`${bar.startDate} – ${bar.endDate}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: barTop,
                    height: barHeight,
                    background: bg,
                    border,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.legend} style={{ paddingLeft: labelWidth }}>
        {LEGEND.map(item => (
          <span key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
