import { z } from 'zod'

import { credentialFieldRegistry } from '../shared/credentials/describe-credential-fields'

/**
 * Pipedrive connector credentials. `apiToken` authenticates API calls (passed
 * as `?api_token=`); `companyDomain` builds the per-tenant API base.
 * `activityType` is the Pipedrive activity type for logged touches;
 * `phoneFieldKey` maps which deal field holds the phone when it is not the
 * default. `webhookToken` is the per-account secret the Pipedrive webhook
 * handler verifies — server-generated when the connector account is created.
 * `.strict()` rejects unknown keys.
 */
export const pipedriveCredentialsSchema = z
  .object({
    apiToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'API token', type: 'secret' }),
    companyDomain: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Company domain', type: 'text' }),
    activityType: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Activity type', type: 'text' })
      .default('task'),
    phoneFieldKey: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Phone field key', type: 'text' })
      .optional(),
    webhookToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, {
        label: 'Webhook token',
        type: 'secret',
        serverGenerated: true,
      })
      .optional(),
  })
  .strict()

export type PipedriveCredentials = z.infer<typeof pipedriveCredentialsSchema>

/**
 * Create-time input shape for the Pipedrive connector. `apiToken` is the only
 * required field; the server derives `companyDomain` from Pipedrive
 * `/v1/users/me` when omitted, and `webhookToken` is server-generated. The
 * optional `companyDomain` here lets a custom-host operator override the
 * auto-derive. `webhookToken` is intentionally absent — the create use case
 * strips client values defensively.
 */
export const pipedriveCredentialsInputSchema = z
  .object({
    apiToken: pipedriveCredentialsSchema.shape.apiToken,
    companyDomain: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Company domain', type: 'text' })
      .optional(),
    activityType: pipedriveCredentialsSchema.shape.activityType,
    phoneFieldKey: pipedriveCredentialsSchema.shape.phoneFieldKey,
  })
  .strict()

export type PipedriveCredentialsInput = z.infer<typeof pipedriveCredentialsInputSchema>
