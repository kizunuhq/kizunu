import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'

/**
 * Filters a plugin's credential descriptor down to the entries the operator
 * provides — i.e. drops `serverGenerated` fields the API fills in itself
 * (e.g. Meta's per-channel verifyToken). The web form should not render
 * inputs for those, and `hasRequiredCredentials` should not require them.
 */
export function userInputFields(fields: ChannelCredentialField[]): ChannelCredentialField[] {
  return fields.filter((field) => field.serverGenerated !== true)
}
