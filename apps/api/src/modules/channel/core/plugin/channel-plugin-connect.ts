export const ChannelPluginConnectKind = {
  Credentials: 'credentials',
  Oauth: 'oauth',
} as const

export type ChannelPluginConnectKind =
  (typeof ChannelPluginConnectKind)[keyof typeof ChannelPluginConnectKind]

export const OauthProvider = {
  MetaCoex: 'meta-coex',
} as const

export type OauthProvider = (typeof OauthProvider)[keyof typeof OauthProvider]

export type ChannelPluginConnect =
  | { kind: typeof ChannelPluginConnectKind.Credentials }
  | { kind: typeof ChannelPluginConnectKind.Oauth; provider: OauthProvider }
