/**
 * A cadence-level sending window: timezone + allowed weekdays + minute-of-day
 * bounds. Dispatch outside the window is deferred (the journey stays
 * `running`, `nextTouchAt` slides forward to the next valid slot).
 *
 * Cross-midnight windows (endMinute < startMinute) are out of scope for
 * v0.1 — admins split into separate cadences if needed.
 */
export interface SendingWindow {
  /** IANA timezone, e.g. 'America/Sao_Paulo'. Validated at the contract layer. */
  timezone: string
  /** Allowed day-of-week numbers (0=Sun..6=Sat). Non-empty, max 7. */
  days: readonly number[]
  /** Minute-of-day window start, 0..1440. */
  startMinute: number
  /** Minute-of-day window end (exclusive), > startMinute, <= 1440. */
  endMinute: number
}
