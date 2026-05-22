const HOURS_IN_WINDOW = 24
const MS_PER_HOUR = 60 * 60 * 1000

/** Meta's customer-service window: freeform replies are allowed for 24h after the
 * lead's last inbound message. Outside it, only approved templates may be sent. */
export const CUSTOMER_SERVICE_WINDOW_MS = HOURS_IN_WINDOW * MS_PER_HOUR

/**
 * Whether `now` falls inside the 24h window opened by the lead's last inbound
 * message. No prior inbound means the window was never opened. The boundary is
 * inclusive: exactly 24h still counts as open.
 */
export function isWithinServiceWindow(now: Date, lastInboundAt?: Date): boolean {
  if (lastInboundAt === undefined) return false
  return now.getTime() - lastInboundAt.getTime() <= CUSTOMER_SERVICE_WINDOW_MS
}
