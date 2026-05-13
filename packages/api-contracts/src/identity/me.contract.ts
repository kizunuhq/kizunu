import { z } from 'zod'

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    emailVerifiedAt: z.string().datetime().nullable(),
  }),
  memberships: z.array(
    z.object({
      workspaceId: z.string().uuid(),
      workspaceName: z.string(),
      workspaceSlug: z.string(),
      role: z.enum(['admin', 'member']),
      status: z.enum(['active', 'inactive']),
    }),
  ),
  activeWorkspaceId: z.string().uuid().nullable(),
})

export type MeResponse = z.infer<typeof MeResponseSchema>
