import { z } from 'zod'

/**
 * Closed vocabularies for the connector health-check shape (`.agents/rules/
 * enums.md` §1). Both `status` (per-check) and `overall` (rolled up) are
 * branched on by the web app for pill styling, so the values live in
 * named const objects with derived types — never bare unions.
 */
export const ConnectorHealthCheckStatus = {
  Ok: 'ok',
  Fail: 'fail',
} as const

export type ConnectorHealthCheckStatus =
  (typeof ConnectorHealthCheckStatus)[keyof typeof ConnectorHealthCheckStatus]

export const ConnectorHealthOverall = {
  Ready: 'ready',
  Degraded: 'degraded',
  Unreachable: 'unreachable',
} as const

export type ConnectorHealthOverall =
  (typeof ConnectorHealthOverall)[keyof typeof ConnectorHealthOverall]

export const ConnectorHealthCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.union([
    z.literal(ConnectorHealthCheckStatus.Ok),
    z.literal(ConnectorHealthCheckStatus.Fail),
  ]),
  detail: z.string().optional(),
})

export type ConnectorHealthCheck = z.infer<typeof ConnectorHealthCheckSchema>

export const ConnectorHealthSchema = z.object({
  overall: z.union([
    z.literal(ConnectorHealthOverall.Ready),
    z.literal(ConnectorHealthOverall.Degraded),
    z.literal(ConnectorHealthOverall.Unreachable),
  ]),
  checks: z.array(ConnectorHealthCheckSchema),
})

export type ConnectorHealth = z.infer<typeof ConnectorHealthSchema>
