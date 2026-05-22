const ONE_MINUTE_MS = 60_000
const AUTH_REQUESTS_PER_MINUTE = 10

/** Shared IP rate limit for unauthenticated `auth/*` endpoints (ADR-006). */
export const AUTH_THROTTLE = { default: { limit: AUTH_REQUESTS_PER_MINUTE, ttl: ONE_MINUTE_MS } }
