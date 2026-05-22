import { z } from 'zod'

export const SessionViewSchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime(),
  isCurrent: z.boolean(),
})

export type SessionView = z.infer<typeof SessionViewSchema>

export const SessionsResponseSchema = z.object({
  sessions: z.array(SessionViewSchema),
})

export type SessionsResponse = z.infer<typeof SessionsResponseSchema>
