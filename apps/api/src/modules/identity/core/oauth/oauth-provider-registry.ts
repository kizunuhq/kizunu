import { Inject, Injectable } from '@nestjs/common'

import { UnknownOAuthProviderException } from '../errors/identity.errors'
import type { OAuthProvider } from './oauth-provider'
import type { OAuthProviderManifest } from './oauth-provider-manifest'

/** DI token for the array of enabled OAuth providers wired into the module. */
export const OAUTH_PROVIDERS = Symbol('OAUTH_PROVIDERS')

/**
 * Resolves OAuth providers by id. Providers are injected as a multi-provider array
 * (only the env-enabled ones are wired) and indexed at construction; a duplicate id
 * is a wiring error and fails fast.
 */
@Injectable()
export class OAuthProviderRegistry {
  private readonly providers = new Map<string, OAuthProvider>()

  constructor(@Inject(OAUTH_PROVIDERS) providers: OAuthProvider[]) {
    for (const provider of providers) {
      if (this.providers.has(provider.manifest.id)) {
        throw new Error(`Duplicate OAuth provider id: ${provider.manifest.id}`)
      }
      this.providers.set(provider.manifest.id, provider)
    }
  }

  get(id: string): OAuthProvider {
    const provider = this.providers.get(id)
    if (!provider) throw new UnknownOAuthProviderException(id)
    return provider
  }

  listManifests(): OAuthProviderManifest[] {
    return [...this.providers.values()].map((provider) => provider.manifest)
  }
}
