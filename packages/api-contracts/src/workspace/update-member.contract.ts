import { z } from 'zod'

export const UpdateMemberRequestSchema = z.object({
  status: z.enum(['active', 'inactive']),
})

export type UpdateMemberRequest = z.infer<typeof UpdateMemberRequestSchema>

export const UpdateMemberResponseSchema = z.object({
  membershipId: z.uuid(),
  status: z.enum(['active', 'inactive']),
})

export type UpdateMemberResponse = z.infer<typeof UpdateMemberResponseSchema>
