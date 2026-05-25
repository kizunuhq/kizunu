import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'

/**
 * Filters a plugin's credential descriptor down to the entries the operator
 * provides — i.e. drops `serverGenerated` fields the API fills in itself
 * (e.g. Meta's per-channel verifyToken). The web form does not render inputs
 * for those, and the zodResolver schema's `inputSchema` projection on the
 * server already excludes them from validation.
 */
export function userInputFields(fields: ChannelCredentialField[]): ChannelCredentialField[] {
  return fields.filter((field) => field.serverGenerated !== true)
}
