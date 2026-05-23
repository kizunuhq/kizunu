/**
 * The two Meta Coex OAuth exchanges that can fail.
 * `CodeExchange` is the initial Embedded Signup `code`-for-token swap;
 * `RefreshExchange` is the long-lived refresh driven by
 * `OAuthRefreshService` (grant_type `fb_exchange_token`). Surfaced as the
 * `step` field on `MetaConnectFailedException` so the web surface can
 * distinguish which leg failed.
 */
export const MetaConnectStep = {
  CodeExchange: 'code-exchange',
  RefreshExchange: 'refresh-exchange',
} as const

export type MetaConnectStep = (typeof MetaConnectStep)[keyof typeof MetaConnectStep]
