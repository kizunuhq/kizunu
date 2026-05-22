import { z } from 'zod'

export const InviteMemberRequestSchema = z.object({
  email: z.email().max(255),
  expiresInDays: z.coerce.number().int().positive().max(30).optional(),
})

export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>

export const InviteMemberResponseSchema = z.object({
  invitationToken: z.string(),
  expiresAt: z.iso.datetime(),
})

export type InviteMemberResponse = z.infer<typeof InviteMemberResponseSchema>
