import { z } from 'zod'

/**
 * Credentials a Meta/WhatsApp ChannelAccount stores after onboarding. Camel-case
 * keys map to Meta's `waba_id` / `phone_number_id`; the system token
 * authenticates Graph API send calls. `appId` + `appSecret` build the App
 * Access Token (`{appId}|{appSecret}`) used for the app-level webhook
 * subscription (feature 029, research §D.4). `verifyToken` is server-generated
 * during `onAccountCreated` — the operator never supplies it — and is checked
 * against `hub.verify_token` on the per-channel inbound webhook. `.strict()`
 * rejects unknown keys. Plugin `send` / `parseInbound` paths parse against this
 * full schema; the create flow validates input against
 * {@link metaCredentialsClientSchema} below.
 */
export const metaCredentialsSchema = z
  .object({
    appId: z.string().min(1),
    appSecret: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
    verifyToken: z.string().min(1),
  })
  .strict()

export type MetaCredentials = z.infer<typeof metaCredentialsSchema>

/**
 * What the operator submits when creating a Meta channel account: every stored
 * field EXCEPT `verifyToken`, which is server-generated in `onAccountCreated`.
 * The plugin manifest's `configSchema` points here so the registry's
 * `validateCredentials` accepts the 5-field create payload.
 */
export const metaCredentialsClientSchema = metaCredentialsSchema.omit({ verifyToken: true })

export type MetaCredentialsClientInput = z.infer<typeof metaCredentialsClientSchema>
