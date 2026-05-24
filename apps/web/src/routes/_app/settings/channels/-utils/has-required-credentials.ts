import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'

/**
 * True when every required field has a non-blank value. Client-side gate only — the
 * plugin's configSchema stays the validation authority on the server.
 */
export function hasRequiredCredentials(
  fields: ChannelCredentialField[],
  values: Record<string, unknown>,
): boolean {
  return fields.every((field) => {
    if (!field.required) return true
    const value = values[field.key]
    return typeof value === 'string' && value.trim().length > 0
  })
}
