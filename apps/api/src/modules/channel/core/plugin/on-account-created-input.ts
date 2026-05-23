/**
 * Input passed to {@link ChannelPlugin.onAccountCreated} after the use-case has
 * validated the credentials and pre-minted the channel-account id, before the
 * row is persisted. The hook may reach out to the provider (e.g. Meta's webhook
 * subscription endpoints) and return the credentials kizunu should persist —
 * typically the input enriched with provider-issued or server-generated fields
 * (e.g. a per-channel `verifyToken`).
 *
 * `channelAccountId` is the UUID kizunu will use as the row id, so plugins can
 * include it in callback URLs the provider should call back into.
 * `appUrl` is the kizunu-side base URL the provider will hit.
 */
export interface OnAccountCreatedInput {
  channelAccountId: string
  appUrl: string
  credentials: unknown
}
