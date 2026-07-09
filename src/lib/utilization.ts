import { parseDate, daysBetween } from './dateUtils'

export type AssignmentForUtil = {
  hours: number
  startDate: string
  endDate: string
}

function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = aStart > bStart ? aStart : bStart
  const e = aEnd < bEnd ? aEnd : bEnd
  if (s > e) return 0
  return daysBetween(s, e) + 1
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d)
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function assignmentWeeklyRate(a: AssignmentForUtil): number {
  const start = parseDate(a.startDate)
  const end = parseDate(a.endDate)
  const totalDays = Math.max(daysBetween(start, end) + 1, 1)
  const weeks = Math.max(totalDays / 7, 0.5)
  return a.hours / weeks
}

function scheduledHoursForWeek(assignments: AssignmentForUtil[], weekStart: Date, weekEnd: Date): number {
  let total = 0
  for (const a of assignments) {
    const aStart = parseDate(a.startDate)
    const aEnd = parseDate(a.endDate)
    const overlap = overlapDays(weekStart, weekEnd, aStart, aEnd)
    if (overlap <= 0) continue
    const rate = assignmentWeeklyRate(a)
    total += rate * (overlap / 7)
  }
  return total
}

export function rollingUtilizationPct(
  assignments: AssignmentForUtil[],
  weeklyCapacity: number,
  numWeeks: number,
  today: Date,
): number {
  if (!assignments.length || weeklyCapacity <= 0) return 0
  const monday = startOfWeekMonday(today)
  let totalPct = 0
  for (let i = 0; i < numWeeks; i++) {
    const weekStart = addDays(monday, i * 7)
    const weekEnd = addDays(weekStart, 6)
    const hours = scheduledHoursForWeek(assignments, weekStart, weekEnd)
    totalPct += hours / weeklyCapacity
  }
  return (totalPct / numWeeks) * 100
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

export function utilizationColor(pct: number): string {
  const p = Math.min(pct / 100, 1)
  let r: number, g: number, b: number
  if (p <= 0.7) {
    const t = p / 0.7
    r = lerp(74, 184, t)
    g = lerp(124, 134, t)
    b = lerp(89, 46, t)
  } else {
    const t = (p - 0.7) / 0.3
    r = lerp(184, 181, t)
    g = lerp(134, 67, t)
    b = lerp(46, 47, t)
  }
  return `rgb(${r}, ${g}, ${b})`
}

export function ringBackground(pct: number, color: string): string {
  const clampedPct = Math.min(Math.max(pct, 0), 100)
  const trackColor = '#e7ded0'
  return `conic-gradient(from -90deg, ${color} ${clampedPct}%, ${trackColor} ${clampedPct}%)`
}

export function weeklySchedule(
  assignments: AssignmentForUtil[],
  numWeeks: number,
  today: Date,
): Array<{ weekStart: Date; hours: number }> {
  const monday = startOfWeekMonday(today)
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = addDays(monday, i * 7)
    const weekEnd = addDays(weekStart, 6)
    return { weekStart, hours: scheduledHoursForWeek(assignments, weekStart, weekEnd) }
  })
}
