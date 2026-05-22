import type { ZodType } from 'zod'

import type { ChannelCapability } from './channel-capability'
import type { ChannelCredentialField } from './channel-credential-field'

/**
 * Static description of a channel plugin. `configSchema` validates the credentials
 * stored on a ChannelAccount, so plugin-specific fields (e.g. Meta's waba_id) stay
 * inside the plugin and never leak into the domain. `credentialFields` is the
 * declarative projection of those credentials the web app renders a form from.
 */
export interface ChannelPluginManifest {
  id: string
  name: string
  capabilities: ChannelCapability[]
  configSchema: ZodType
  credentialFields: ChannelCredentialField[]
}
