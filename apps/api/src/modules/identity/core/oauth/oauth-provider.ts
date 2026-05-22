import type { OAuthProfile } from './oauth-profile'
import type { OAuthProviderManifest } from './oauth-provider-manifest'

/**
 * The OAuth provider port. Concrete providers (GitHub today, Google/etc. later)
 * implement this as in-monorepo modules behind the registry, so adding a provider
 * is a plugin rather than a rewrite. The authorization-code flow is split into the
 * redirect URL and the code exchange.
 */
export interface OAuthProvider {
  readonly manifest: OAuthProviderManifest
  authorizationUrl(input: { state: string; redirectUri: string }): string
  exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthProfile>
}
