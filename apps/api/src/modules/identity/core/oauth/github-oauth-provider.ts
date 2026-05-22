import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'
import { z, type ZodType } from 'zod'

import type { OAuthProfile } from './oauth-profile'
import type { OAuthProvider } from './oauth-provider'
import type { OAuthProviderManifest } from './oauth-provider-manifest'

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const USER_URL = 'https://api.github.com/user'
const EMAILS_URL = 'https://api.github.com/user/emails'
const SCOPE = 'read:user user:email'

const tokenSchema = z.object({ access_token: z.string() })
const userSchema = z.object({ id: z.number(), name: z.string().nullable(), login: z.string() })
const emailsSchema = z.array(
  z.object({ email: z.email(), primary: z.boolean(), verified: z.boolean() }),
)

@Injectable()
export class GithubOAuthProvider implements OAuthProvider {
  readonly manifest: OAuthProviderManifest = { id: 'github', label: 'GitHub' }

  constructor(private readonly config: ConfigService<Config>) {}

  authorizationUrl(input: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: this.config.get('oauth.github.clientId'),
      redirect_uri: input.redirectUri,
      scope: SCOPE,
      state: input.state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  }

  async exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthProfile> {
    const accessToken = await this.fetchAccessToken(input)
    const user = await this.fetchJson(USER_URL, accessToken, userSchema)
    const emails = await this.fetchJson(EMAILS_URL, accessToken, emailsSchema)
    const primary = emails.find((entry) => entry.primary) ?? emails[0]

    return {
      providerAccountId: String(user.id),
      email: primary?.email ?? '',
      emailVerified: primary?.verified ?? false,
      name: user.name ?? user.login,
    }
  }

  private async fetchAccessToken(input: { code: string; redirectUri: string }): Promise<string> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.config.get('oauth.github.clientId'),
        client_secret: this.config.get('oauth.github.clientSecret'),
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
    })
    const parsed = tokenSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error('GitHub did not return an access token')
    return parsed.data.access_token
  }

  private async fetchJson<T>(url: string, accessToken: string, schema: ZodType<T>): Promise<T> {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' },
    })
    if (!response.ok) throw new Error(`GitHub request failed: ${url}`)
    return schema.parse(await response.json())
  }
}
