import { z } from 'zod'

/**
 * Credentials a Meta/WhatsApp ChannelAccount stores. Camel-case keys map to Meta's
 * `waba_id` / `phone_number_id`; the system token authenticates Graph API calls.
 * `.strict()` rejects unknown keys. This is the plugin's manifest configSchema, so
 * channel-account creation validates Meta credentials through the registry.
 */
export const metaCredentialsSchema = z
  .object({
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
  })
  .strict()

export type MetaCredentials = z.infer<typeof metaCredentialsSchema>
