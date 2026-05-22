import type { ChannelCredentialFieldType } from './channel-credential-field-type'

/**
 * Declarative description of one credential a channel plugin needs. The web app
 * renders an input per field; `key` mirrors a key in the plugin's configSchema so
 * the two cannot silently diverge (guarded by a plugin-local unit test).
 */
export interface ChannelCredentialField {
  key: string
  label: string
  type: ChannelCredentialFieldType
  required: boolean
}
