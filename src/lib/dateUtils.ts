export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateRange(startStr: string, endStr: string): string {
  const sd = parseDate(startStr)
  const ed = parseDate(endStr)
  const fmt = (d: Date, includeYear: boolean) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(includeYear ? { year: 'numeric' } : {}),
    })

  if (sd.getFullYear() === ed.getFullYear()) {
    return `${fmt(sd, false)} – ${fmt(ed, true)}`
  }
  return `${fmt(sd, true)} – ${fmt(ed, true)}`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function deriveStatus(startDate: string, endDate: string, completed?: boolean | null): 'upcoming' | 'active' | 'complete' {
  if (completed) return 'complete'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (today < start) return 'upcoming'
  if (today > end) return 'complete'
  return 'active'
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
