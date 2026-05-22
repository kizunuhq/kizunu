import { z } from 'zod'

export const CreateChannelAccountRequestSchema = z.object({
  pluginId: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  credentials: z.record(z.string(), z.unknown()),
})

export type CreateChannelAccountRequest = z.infer<typeof CreateChannelAccountRequestSchema>

export const CreateChannelAccountResponseSchema = z.object({
  id: z.uuid(),
  pluginId: z.string(),
  name: z.string(),
})

export type CreateChannelAccountResponse = z.infer<typeof CreateChannelAccountResponseSchema>
