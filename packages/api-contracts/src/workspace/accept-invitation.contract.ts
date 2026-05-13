import { z } from 'zod'

export const AcceptInvitationRequestSchema = z.object({
  token: z.string().min(1),
})

export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>

export const AcceptInvitationResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  role: z.enum(['admin', 'member']),
})

export type AcceptInvitationResponse = z.infer<typeof AcceptInvitationResponseSchema>
