/**
 * Input passed to {@link ChannelPlugin.refreshCredentials} by the
 * `OAuthRefreshService` when a channel-account's OAuth access token is near
 * expiry. The hook returns the credentials kizunu should persist — typically
 * the input shape with a refreshed `accessToken` + `accessTokenExpiresAt`.
 *
 * No `appUrl` like in {@link OnAccountCreatedInput} because refresh is a
 * server-to-server call against the provider's token endpoint and does not
 * need to know kizunu's public base URL.
 */
export interface RefreshCredentialsInput<T = unknown> {
  channelAccountId: string
  credentials: T
}
