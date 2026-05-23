import { z } from 'zod'

/**
 * Credentials a Meta/WhatsApp ChannelAccount stores. Camel-case keys map to Meta's
 * `waba_id` / `phone_number_id`; the system token authenticates Graph API send
 * calls. `appId` + `appSecret` build the App Access Token (`{appId}|{appSecret}`)
 * used for the app-level webhook subscription (feature 029, research §D.4).
 * `verifyToken` is server-generated during `onAccountCreated` — the operator
 * never supplies it — and is checked against `hub.verify_token` on the
 * per-channel inbound webhook. `.strict()` rejects unknown keys. This is the
 * plugin's manifest configSchema, so channel-account creation validates Meta
 * credentials through the registry.
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
