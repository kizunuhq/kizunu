import { z } from 'zod'

import { credentialFieldRegistry } from '../shared/credentials/describe-credential-fields'
import { oauthCredentialFields } from '../shared/oauth-credential-fields'

const cloudApiCredentialsSchema = z
  .object({
    channelMode: z.literal('cloud_api'),
    appId: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Meta App ID', type: 'text' }),
    appSecret: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Meta App Secret', type: 'secret' }),
    wabaId: z.string().min(1).register(credentialFieldRegistry, { label: 'WABA ID', type: 'text' }),
    phoneNumberId: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Phone number ID', type: 'text' }),
    systemToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'System token', type: 'secret' }),
    verifyToken: z.string().min(1).register(credentialFieldRegistry, {
      label: 'Verify token',
      type: 'secret',
      serverGenerated: true,
    }),
  })
  .strict()

const coexistenceCredentialsSchema = z
  .object({
    channelMode: z.literal('coexistence'),
    wabaId: z.string().min(1).register(credentialFieldRegistry, { label: 'WABA ID', type: 'text' }),
    phoneNumberId: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Phone number ID', type: 'text' }),
    verifyToken: z.string().min(1).register(credentialFieldRegistry, {
      label: 'Verify token',
      type: 'secret',
      serverGenerated: true,
    }),
    ...oauthCredentialFields,
  })
  .strict()

export const metaCredentialsSchema = z.discriminatedUnion('channelMode', [
  cloudApiCredentialsSchema,
  coexistenceCredentialsSchema,
])

export const metaCoexistenceCredentialsSchema = z
  .object({
    channelMode: z.literal('coexistence'),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    verifyToken: z.string().min(1),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    accessTokenExpiresAt: z.iso.datetime().optional(),
  })
  .strict()

export type MetaCredentials = z.infer<typeof metaCredentialsSchema>
export type MetaCloudApiCredentials = z.infer<typeof cloudApiCredentialsSchema>
export type MetaCoexistenceCredentials = z.infer<typeof coexistenceCredentialsSchema>

export const metaCredentialsClientSchema = cloudApiCredentialsSchema.omit({
  verifyToken: true,
  channelMode: true,
})

export type MetaCredentialsClientInput = z.infer<typeof metaCredentialsClientSchema>
