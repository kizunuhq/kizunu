import { metaCredentialsClientSchema } from '@kizunu/api-contracts/channel'
import { z, type ZodType } from 'zod'

/**
 * Per-plugin client-side credentials schema for the create-channel-account
 * form. The form resolver wraps the active schema in `zodResolver` so a
 * missing/invalid field surfaces as a per-field error instead of relying on
 * the hand-rolled hasRequiredCredentials check that lived next to today's
 * form. The mapping is keyed by `manifest.id` from `GET /channel-plugins`.
 *
 * Plugins that the web hasn't been built against yet fall back to an open
 * record schema — the API still validates against its own configSchema, so
 * the form will surface the server's 422 rather than break locally.
 */
const PLUGIN_CLIENT_SCHEMAS: Readonly<Record<string, ZodType>> = {
  'meta-whatsapp': metaCredentialsClientSchema,
}

const OPEN_CREDENTIALS_FALLBACK = z.record(z.string(), z.unknown())

export function getCredentialsSchema(pluginId: string): ZodType {
  return PLUGIN_CLIENT_SCHEMAS[pluginId] ?? OPEN_CREDENTIALS_FALLBACK
}
