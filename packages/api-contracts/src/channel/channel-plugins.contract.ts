import { z } from 'zod'

import { CredentialFieldType } from '../shared/credentials/credential-field-type'

export const ChannelCredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum([CredentialFieldType.Text, CredentialFieldType.Secret]),
  required: z.boolean(),
  // True when the value is filled by the server (e.g. a generated per-channel
  // verify token) rather than the operator. UI omits these from the input form
  // and the API rejects client-supplied values for them at the plugin layer.
  serverGenerated: z.boolean().optional(),
})

export const ChannelPluginConnectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('credentials') }),
  z.object({ kind: z.literal('oauth'), provider: z.literal('meta-coex') }),
])

export const ChannelPluginsResponseSchema = z.object({
  plugins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      capabilities: z.array(z.enum(['freeform', 'template', 'media'])),
      credentialFields: z.array(ChannelCredentialFieldSchema),
      connect: ChannelPluginConnectSchema,
    }),
  ),
})

export type ChannelCredentialField = z.infer<typeof ChannelCredentialFieldSchema>

export type ChannelPluginConnect = z.infer<typeof ChannelPluginConnectSchema>

export type ChannelPluginsResponse = z.infer<typeof ChannelPluginsResponseSchema>
