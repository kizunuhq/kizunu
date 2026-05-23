import { oauthCredentialFields } from '@kizunu/api-contracts/shared'
import { z } from 'zod'

/**
 * Meta credentials are a discriminated union by `channelMode`:
 *
 * - `cloud_api`: the operator-pasted onboarding (feature 029). Carries the
 *   App Access Token components, the per-channel verifyToken, and the
 *   long-lived System Token used for outbound + per-WABA subscription.
 *
 * - `coexistence`: Embedded Signup (feature 031). The OAuth triplet from
 *   `030`'s shared mixin replaces `appId/appSecret/systemToken`; the
 *   business token expires and rolls via `OAuthRefreshService`. The app-wide
 *   `meta.appId` / `meta.appSecret` config provides the App credentials at
 *   the plugin layer; they never sit on the row.
 *
 * `verifyToken` is server-generated during `onAccountCreated` in both modes.
 *
 * The cloud_api branch is also the schema operators interact with directly —
 * `metaCredentialsClientSchema` below omits `verifyToken` because it is
 * server-generated. Coex credentials are constructed by the connect endpoint;
 * the operator never types them.
 */
const cloudApiCredentialsSchema = z
  .object({
    channelMode: z.literal('cloud_api'),
    appId: z.string().min(1),
    appSecret: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
    verifyToken: z.string().min(1),
  })
  .strict()

const coexistenceCredentialsSchema = z
  .object({
    channelMode: z.literal('coexistence'),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    verifyToken: z.string().min(1),
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

/**
 * What the operator submits when creating a cloud_api Meta channel account:
 * every stored field EXCEPT `verifyToken` (server-generated in
 * `onAccountCreated`) and `channelMode` (defaulted to `'cloud_api'` by the
 * plugin's `onAccountCreated`). The plugin manifest's `configSchema` points
 * here so the registry's `validateCredentials` accepts the form payload.
 */
export const metaCredentialsClientSchema = cloudApiCredentialsSchema.omit({
  verifyToken: true,
  channelMode: true,
})

export type MetaCredentialsClientInput = z.infer<typeof metaCredentialsClientSchema>
