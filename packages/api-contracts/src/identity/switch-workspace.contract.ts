import { z } from 'zod'

export const SwitchWorkspaceRequestSchema = z.object({
  workspaceId: z.string().uuid(),
})

export type SwitchWorkspaceRequest = z.infer<typeof SwitchWorkspaceRequestSchema>

export const SwitchWorkspaceResponseSchema = z.object({
  activeWorkspaceId: z.string().uuid(),
})

export type SwitchWorkspaceResponse = z.infer<typeof SwitchWorkspaceResponseSchema>
