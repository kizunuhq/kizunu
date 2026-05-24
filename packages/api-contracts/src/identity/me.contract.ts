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
  connectorIdentities: z.array(
    z.object({
      connectorAccountId: z.uuid(),
      connectorId: z.string().min(1),
      externalId: z.string().min(1),
    }),
  ),
  activeWorkspaceId: z.uuid().nullable(),
})

export type MeResponse = z.infer<typeof MeResponseSchema>
