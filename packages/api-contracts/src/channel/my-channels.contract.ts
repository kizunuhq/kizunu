import { z } from 'zod'

export const MyChannelsResponseSchema = z.object({
  channels: z.array(
    z.object({
      channelAccountId: z.uuid(),
      pluginId: z.string(),
      name: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
})

export type MyChannelsResponse = z.infer<typeof MyChannelsResponseSchema>
