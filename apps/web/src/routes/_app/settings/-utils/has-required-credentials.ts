import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'

/**
 * True when every required field has a non-blank value. Client-side gate only — the
 * plugin's configSchema stays the validation authority on the server.
 */
export function hasRequiredCredentials(
  fields: ChannelCredentialField[],
  values: Record<string, string>,
): boolean {
  return fields.every((field) => !field.required || (values[field.key] ?? '').trim().length > 0)
}
