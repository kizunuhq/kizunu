import { z } from 'zod'

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
    emailVerifiedAt: z.iso.datetime().nullable(),
  }),
  memberships: z.array(
    z.object({
      workspaceId: z.uuid(),
      workspaceName: z.string(),
      workspaceSlug: z.string(),
      role: z.enum(['admin', 'member']),
      status: z.enum(['active', 'inactive']),
    }),
  ),
  activeWorkspaceId: z.uuid().nullable(),
})

export type MeResponse = z.infer<typeof MeResponseSchema>
