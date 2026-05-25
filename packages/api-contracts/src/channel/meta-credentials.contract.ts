import { z } from 'zod'

import { oauthCredentialFields } from '../shared/oauth-credential-fields'

const cloudApiCredentialsSchema = z
  .object({
    channelMode: z.literal('cloud_api'),
    appId: z.string().min(1).meta({ label: 'Meta App ID', type: 'text' }),
    appSecret: z.string().min(1).meta({ label: 'Meta App Secret', type: 'secret' }),
    wabaId: z.string().min(1).meta({ label: 'WABA ID', type: 'text' }),
    phoneNumberId: z.string().min(1).meta({ label: 'Phone number ID', type: 'text' }),
    systemToken: z.string().min(1).meta({ label: 'System token', type: 'secret' }),
    verifyToken: z
      .string()
      .min(1)
      .meta({ label: 'Verify token', type: 'secret', serverGenerated: true }),
  })
  .strict()

const coexistenceCredentialsSchema = z
  .object({
    channelMode: z.literal('coexistence'),
    wabaId: z.string().min(1).meta({ label: 'WABA ID', type: 'text' }),
    phoneNumberId: z.string().min(1).meta({ label: 'Phone number ID', type: 'text' }),
    verifyToken: z
      .string()
      .min(1)
      .meta({ label: 'Verify token', type: 'secret', serverGenerated: true }),
    ...oauthCredentialFields,
  })
  .strict()

export const metaCredentialsSchema = z.discriminatedUnion('channelMode', [
  cloudApiCredentialsSchema,
  coexistenceCredentialsSchema,
])

export type MetaCredentials = z.infer<typeof metaCredentialsSchema>
export type MetaCloudApiCredentials = z.infer<typeof cloudApiCredentialsSchema>
export type MetaCoexistenceCredentials = z.infer<typeof coexistenceCredentialsSchema>

export const metaCredentialsClientSchema = cloudApiCredentialsSchema.omit({
  verifyToken: true,
  channelMode: true,
})

export type MetaCredentialsClientInput = z.infer<typeof metaCredentialsClientSchema>
