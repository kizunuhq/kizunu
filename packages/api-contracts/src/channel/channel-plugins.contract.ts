import { z } from 'zod'

export const ChannelPluginsResponseSchema = z.object({
  plugins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      capabilities: z.array(z.enum(['freeform', 'template', 'media'])),
    }),
  ),
})

export type ChannelPluginsResponse = z.infer<typeof ChannelPluginsResponseSchema>
