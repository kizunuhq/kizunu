import type {
  MetaCoexistenceCredentials,
  metaCoexistenceCredentialsSchema,
} from '@kizunu/api-contracts/channel'
import type { Assert, Equal } from '@kizunu/nestjs-shared/lib/types/type-assert'

export type _CoexistenceSchemaMatchesVariant = Assert<
  Equal<(typeof metaCoexistenceCredentialsSchema)['_output'], MetaCoexistenceCredentials>
>

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
