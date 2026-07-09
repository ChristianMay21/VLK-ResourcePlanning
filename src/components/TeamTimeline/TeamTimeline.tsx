'use client'

import { useState, useMemo } from 'react'
import EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import { useDrawer } from '@/context/DrawerContext'
import { getInitials, parseDate } from '@/lib/dateUtils'
import styles from './TeamTimeline.module.scss'

export type TimelineEntry = {
  employeeId: string
  hours: number
  startDate: string
  endDate: string
  isInternal: boolean
  itemName: string
  contextName: string
}

export type TimelineEmployee = {
  id: string
  name: string
  color: string | null
  capacity: number
}

type TeamTimelineProps = {
  windowWeeks: 4 | 8 | 12
  employees: TimelineEmployee[]
  timelineEntries: TimelineEntry[]
}

type HoverState = {
  employeeId: string
  clientX: number
  clientY: number
  fracX: number
  dateLabel: string
  pctLabel: string
  taskItems: string[]
}

type Week = { start: Date; end: Date; label: string }
type Point = [number, number]

// ── Constants ─────────────────────────────────────────────────────────────────
const TIMELINE_CH = 84
const TIMELINE_MAX_PCT = 130
const TIMELINE_CAP_Y = TIMELINE_CH - (100 / TIMELINE_MAX_PCT) * TIMELINE_CH
const OVERHEAD_COLOR = '#6b6558'

// ── Date helpers ──────────────────────────────────────────────────────────────
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d)
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function overlapDaysCount(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = aStart > bStart ? aStart : bStart
  const e = aEnd < bEnd ? aEnd : bEnd
  if (s > e) return 0
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function getWeeks(numWeeks: number, offsetWeeks: number): Week[] {
  const today = new Date()
  const monday = startOfWeekMonday(today)
  const start = addDays(monday, offsetWeeks * 7)
  return Array.from({ length: numWeeks }, (_, i) => {
    const s = addDays(start, i * 7)
    const e = addDays(s, 6)
    return { start: s, end: e, label: s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  })
}

// ── Chart math ────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function entryWeeklyRate(hours: number, startDate: string, endDate: string): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const totalDays = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1)
  return hours / Math.max(totalDays / 7, 0.5)
}

function utilColorFor(pct: number): string {
  if (pct > 100) return '#b5432f'
  if (pct >= 85) return '#b8862e'
  return '#2c4a6e'
}

// ── SVG path helpers ──────────────────────────────────────────────────────────
function smoothPathD(points: Point[], closeToBaseline: boolean, baselineY?: number): string {
  if (!points.length) return ''
  let d = `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  if (closeToBaseline && baselineY !== undefined) {
    const lastX = points[points.length - 1][0]
    const firstX = points[0][0]
    d += ` L ${lastX.toFixed(2)},${baselineY.toFixed(2)} L ${firstX.toFixed(2)},${baselineY.toFixed(2)} Z`
  }
  return d
}

function smoothAreaBetween(topPoints: Point[], bottomPoints: Point[]): string {
  const forward = smoothPathD(topPoints, false)
  const rev = [...bottomPoints].reverse()
  const backward = smoothPathD(rev, false).replace('M', 'L')
  return forward + ' ' + backward + ' Z'
}

function extendEdges(points: Point[], numWeeks: number): Point[] {
  if (!points.length) return points
  return [[0, points[0][1]], ...points, [numWeeks, points[points.length - 1][1]]]
}

// ── Per-week computation ──────────────────────────────────────────────────────
type WeekData = {
  x: number
  yBillable: number
  yTotal: number
  totalPct: number
  taskItems: string[]
  gradOffset: string
  gradColor: string
}

function computeWeeks(entries: TimelineEntry[], weeks: Week[], capacity: number): WeekData[] {
  return weeks.map((w, i) => {
    let billable = 0
    let internal = 0
    const taskItems: string[] = []

    for (const entry of entries) {
      const s = parseDate(entry.startDate)
      const e = parseDate(entry.endDate)
      const overlap = overlapDaysCount(s, e, w.start, w.end)
      if (overlap <= 0) continue
      const rate = entryWeeklyRate(entry.hours, entry.startDate, entry.endDate)
      const hours = rate * (overlap / 7)
      if (hours < 0.01) continue
      if (entry.isInternal) { internal += hours } else { billable += hours }
      const ctx = entry.contextName ? ` — ${entry.contextName}` : ''
      taskItems.push(`${entry.itemName}${ctx} (${Math.round(hours)}h, ${entry.isInternal ? 'internal' : 'billable'})`)
    }

    const total = billable + internal
    const cap = Math.max(capacity, 1)
    const billablePct = (billable / cap) * 100
    const totalPct = (total / cap) * 100
    const x = i + 0.5

    return {
      x,
      yBillable: TIMELINE_CH - (clamp(billablePct, 0, TIMELINE_MAX_PCT) / TIMELINE_MAX_PCT) * TIMELINE_CH,
      yTotal: TIMELINE_CH - (clamp(totalPct, 0, TIMELINE_MAX_PCT) / TIMELINE_MAX_PCT) * TIMELINE_CH,
      totalPct,
      taskItems,
      gradOffset: `${clamp((x / weeks.length) * 100, 0, 100).toFixed(1)}%`,
      gradColor: utilColorFor(totalPct),
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TeamTimeline(props: TeamTimelineProps) {
  const { setDrawer } = useDrawer()
  const [offset, setOffset] = useState(0)
  const [hover, setHover] = useState<HoverState | null>(null)

  const weeks = useMemo(() => getWeeks(props.windowWeeks, offset), [props.windowWeeks, offset])

  const entriesByEmployee = useMemo(() => {
    const map: Record<string, TimelineEntry[]> = {}
    for (const entry of props.timelineEntries) {
      if (!map[entry.employeeId]) map[entry.employeeId] = []
      map[entry.employeeId].push(entry)
    }
    return map
  }, [props.timelineEntries])

  const rows = useMemo(() => {
    return props.employees.map(emp => {
      const entries = entriesByEmployee[emp.id] ?? []
      const perWeek = computeWeeks(entries, weeks, emp.capacity)
      const billablePts = extendEdges(perWeek.map(w => [w.x, w.yBillable] as Point), props.windowWeeks)
      const totalPts = extendEdges(perWeek.map(w => [w.x, w.yTotal] as Point), props.windowWeeks)
      return {
        emp,
        perWeek,
        billableAreaPath: smoothPathD(billablePts, true, TIMELINE_CH),
        internalAreaPath: smoothAreaBetween(totalPts, billablePts),
        totalStrokePath: smoothPathD(totalPts, false),
        gradientId: `tlgrad-${emp.id}`,
        gradientStops: perWeek.map(w => ({ offset: w.gradOffset, color: w.gradColor })),
      }
    })
  }, [props.employees, entriesByEmployee, weeks, props.windowWeeks])

  const rangeLabel = useMemo(() => {
    if (!weeks.length) return ''
    const s = weeks[0].start
    const e = weeks[weeks.length - 1].end
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }, [weeks])

  const chartViewBox = `0 0 ${props.windowWeeks} ${TIMELINE_CH}`
  const atToday = offset === 0

  function handleMouseMove(evt: React.MouseEvent<HTMLDivElement>, row: (typeof rows)[number]) {
    const rect = evt.currentTarget.getBoundingClientRect()
    const fracX = clamp((evt.clientX - rect.left) / rect.width, 0, 0.999)
    const dayOffset = Math.floor(fracX * props.windowWeeks * 7)
    const weekIndex = clamp(Math.floor(dayOffset / 7), 0, row.perWeek.length - 1)
    const weekData = row.perWeek[weekIndex]
    const date = addDays(weeks[0].start, dayOffset)
    setHover({
      employeeId: row.emp.id,
      clientX: evt.clientX,
      clientY: evt.clientY,
      fracX,
      dateLabel: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      pctLabel: `${Math.round(weekData?.totalPct ?? 0)}%`,
      taskItems: weekData?.taskItems ?? [],
    })
  }

  function openEmployee(employeeId: string) {
    setDrawer({ component: EmployeeDetail, componentProps: { employeeId } })
  }

  if (props.employees.length === 0) return null

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Team Timeline</h3>
        <div className={styles.controls}>
          <span className={styles.rangeLabel}>{rangeLabel}</span>
          <div className={styles.navBtns}>
            <button type="button" className={styles.navBtn} onClick={() => setOffset(o => o - props.windowWeeks)}>
              ‹ PAST
            </button>
            <button
              type="button"
              className={styles.navBtn}
              data-disabled={atToday ? 'true' : undefined}
              onClick={() => { if (!atToday) setOffset(0) }}
            >
              TODAY
            </button>
            <button type="button" className={styles.navBtn} onClick={() => setOffset(o => o + props.windowWeeks)}>
              FUTURE ›
            </button>
          </div>
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendGradient} aria-hidden="true" />
          Billable load (bluer → redder as busier)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendInternal} aria-hidden="true" />
          Internal work
        </span>
        <span className={styles.legendCaption}>
          dashed line = 100% of weekly capacity · hover a row for the exact date
        </span>
      </div>

      <div className={styles.chartBox}>
        {rows.map(row => {
          const isHover = hover?.employeeId === row.emp.id
          return (
            <div key={row.emp.id} className={styles.employeeRow}>
              <button
                type="button"
                className={styles.empHeader}
                onClick={() => openEmployee(row.emp.id)}
              >
                <span
                  className={styles.empAvatar}
                  style={{ '--avatar-bg': row.emp.color ?? '#9a9484' } as React.CSSProperties}
                >
                  {getInitials(row.emp.name)}
                </span>
                <span className={styles.empName}>{row.emp.name}</span>
              </button>

              <div
                className={styles.chartArea}
                onMouseMove={e => handleMouseMove(e, row)}
                onMouseLeave={() => setHover(null)}
              >
                <svg
                  viewBox={chartViewBox}
                  preserveAspectRatio="none"
                  width="100%"
                  height="100%"
                  className={styles.svg}
                >
                  <defs>
                    <linearGradient
                      id={row.gradientId}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2={String(props.windowWeeks)}
                      y2="0"
                    >
                      {row.gradientStops.map((gs, i) => (
                        <stop key={i} offset={gs.offset} stopColor={gs.color} />
                      ))}
                    </linearGradient>
                  </defs>
                  <path
                    d={row.billableAreaPath}
                    fill={`url(#${row.gradientId})`}
                    fillOpacity={0.88}
                    stroke="none"
                  />
                  <path
                    d={row.internalAreaPath}
                    fill={OVERHEAD_COLOR}
                    fillOpacity={0.5}
                    stroke="none"
                  />
                  <path
                    d={row.totalStrokePath}
                    fill="none"
                    stroke="#211f1a"
                    strokeOpacity={0.45}
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1="0"
                    y1={TIMELINE_CAP_Y.toFixed(2)}
                    x2={String(props.windowWeeks)}
                    y2={TIMELINE_CAP_Y.toFixed(2)}
                    stroke="#6b6558"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.7}
                  />
                </svg>
                {isHover && (
                  <div
                    className={styles.crosshair}
                    style={{ left: `${(hover!.fracX * 100).toFixed(2)}%` }}
                  />
                )}
              </div>

              <div className={styles.weekLabels}>
                {weeks.map((w, i) => (
                  <div key={i} className={styles.weekLabel}>{w.label}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {hover && (
        <div
          className={styles.tooltip}
          style={{ top: hover.clientY + 16, left: hover.clientX + 12 }}
        >
          <div className={styles.tooltipDate}>{hover.dateLabel} · {hover.pctLabel}</div>
          <div className={styles.tooltipCount}>{hover.taskItems.length} ASSIGNMENT(S) THIS WEEK</div>
          {hover.taskItems.length === 0 ? (
            <div className={styles.tooltipEmpty}>Nothing scheduled</div>
          ) : (
            hover.taskItems.map((item, i) => (
              <div key={i} className={styles.tooltipItem}>{item}</div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
