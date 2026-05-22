import { z } from 'zod'

export const SwitchWorkspaceRequestSchema = z.object({
  workspaceId: z.uuid(),
})

export type SwitchWorkspaceRequest = z.infer<typeof SwitchWorkspaceRequestSchema>

export const SwitchWorkspaceResponseSchema = z.object({
  activeWorkspaceId: z.uuid(),
})

export type SwitchWorkspaceResponse = z.infer<typeof SwitchWorkspaceResponseSchema>
