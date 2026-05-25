import { z } from 'zod'

export const AuditEventSchema = z.object({
  id: z.uuid(),
  journeyId: z.uuid().nullable(),
  kind: z.string().min(1),
  payload: z.unknown(),
  createdAt: z.iso.datetime(),
})

export type AuditEvent = z.infer<typeof AuditEventSchema>

export const ListAuditEventsResponseSchema = z.object({
  events: z.array(AuditEventSchema),
})

export type ListAuditEventsResponse = z.infer<typeof ListAuditEventsResponseSchema>
