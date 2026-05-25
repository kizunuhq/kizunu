const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Render a relative time difference between an ISO timestamp and `now`,
 * coarse-grained for operational tables. Past values say "Xm ago" /
 * "Xh ago" / "Xd ago"; future values say "in Xm" / "in Xh".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const target = new Date(iso).getTime()
  const diff = target - now.getTime()
  const absMs = Math.abs(diff)
  const direction = diff >= 0 ? 'future' : 'past'

  if (absMs < MINUTE) return direction === 'future' ? 'in <1m' : 'just now'
  if (absMs < HOUR) {
    const minutes = Math.round(absMs / MINUTE)
    return direction === 'future' ? `in ${minutes}m` : `${minutes}m ago`
  }
  if (absMs < DAY) {
    const hours = Math.round(absMs / HOUR)
    return direction === 'future' ? `in ${hours}h` : `${hours}h ago`
  }
  const days = Math.round(absMs / DAY)
  return direction === 'future' ? `in ${days}d` : `${days}d ago`
}
