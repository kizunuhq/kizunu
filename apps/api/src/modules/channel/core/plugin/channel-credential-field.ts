import type { ChannelCredentialFieldType } from './channel-credential-field-type'

/**
 * Declarative description of one credential a channel plugin needs. The web app
 * renders an input per field; `key` mirrors a key in the plugin's configSchema so
 * the two cannot silently diverge (guarded by a plugin-local unit test).
 *
 * `serverGenerated` flags a field that is filled by the server inside
 * `onAccountCreated` (e.g. Meta's per-channel verify token) rather than the
 * operator. The web form skips such fields when rendering inputs.
 */
export interface ChannelCredentialField {
  key: string
  label: string
  type: ChannelCredentialFieldType
  required: boolean
  serverGenerated?: boolean
}
