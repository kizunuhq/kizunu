import type { SendingWindow } from './sending-window'

const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY
const MS_PER_MINUTE = 60_000
const WEEKDAY_TO_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

interface ZonedParts {
  dayOfWeek: number
  minuteOfDay: number
}

function zonedParts(when: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(when)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  const hourOfDay = hour === HOURS_PER_DAY ? 0 : hour
  return {
    dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 1,
    minuteOfDay: hourOfDay * MINUTES_PER_HOUR + minute,
  }
}

export function isWithinWindow(window: SendingWindow, when: Date): boolean {
  const { dayOfWeek, minuteOfDay } = zonedParts(when, window.timezone)
  return (
    window.days.includes(dayOfWeek) &&
    minuteOfDay >= window.startMinute &&
    minuteOfDay < window.endMinute
  )
}

/**
 * Returns the earliest `Date` >= `after` that falls inside the window.
 * Brute-force minute-by-minute scan capped at 7 days — fast (<10ms even
 * worst case) and correct across DST transitions because each candidate
 * is re-evaluated through Intl.
 */
export function slideToWindow(window: SendingWindow, after: Date): Date {
  if (isWithinWindow(window, after)) return after
  const start = after.getTime()
  const ceiling = 7 * MINUTES_PER_DAY
  for (let i = 1; i <= ceiling; i++) {
    const candidate = new Date(start + i * MS_PER_MINUTE)
    if (isWithinWindow(window, candidate)) return candidate
  }
  throw new Error('No valid sending window slot found within 7 days')
}
