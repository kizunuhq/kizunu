import { z } from 'zod'

export const ChannelCredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'secret']),
  required: z.boolean(),
})

export const ChannelPluginsResponseSchema = z.object({
  plugins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      capabilities: z.array(z.enum(['freeform', 'template', 'media'])),
      credentialFields: z.array(ChannelCredentialFieldSchema),
    }),
  ),
})

export type ChannelCredentialField = z.infer<typeof ChannelCredentialFieldSchema>

export type ChannelPluginsResponse = z.infer<typeof ChannelPluginsResponseSchema>
