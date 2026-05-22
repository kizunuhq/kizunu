import { ApiModule } from '@kizunu/api/api.module'
import type { OAuthProfile } from '@kizunu/api/modules/identity/core/oauth/oauth-profile'
import type { OAuthProvider } from '@kizunu/api/modules/identity/core/oauth/oauth-provider'
import { OAUTH_PROVIDERS } from '@kizunu/api/modules/identity/core/oauth/oauth-provider-registry'
import { applyHttpMiddleware } from '@kizunu/api/shared/http/apply-http-middleware'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'

const OK = 200
const FOUND = 302

let currentProfile: OAuthProfile = {
  providerAccountId: 'gh-1',
  email: 'octo@example.com',
  emailVerified: true,
  name: 'Octo Cat',
}

// A fake provider keeps the e2e off the network: begin echoes the state into the
// authorize URL, and the exchange returns whatever the test set as the profile.
const fakeProvider: OAuthProvider = {
  manifest: { id: 'github', label: 'GitHub' },
  authorizationUrl: ({ state }) => `https://provider.test/authorize?state=${state}`,
  exchangeCode: async () => currentProfile,
}

function readStateFromLocation(location: string | undefined): string {
  return location ? (new URL(location).searchParams.get('state') ?? '') : ''
}

function cookieList(setCookie: string | string[] | undefined): string[] {
  if (!setCookie) return []
  return Array.isArray(setCookie) ? setCookie : [setCookie]
}

function hasSessionCookie(setCookie: string | string[] | undefined): boolean {
  return cookieList(setCookie).some((cookie) => cookie.startsWith('kizunu_session='))
}

describe('OAuth login (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ApiModule] })
      .overrideProvider(OAUTH_PROVIDERS)
      .useValue([fakeProvider])
      .compile()
    app = moduleRef.createNestApplication()
    applyHttpMiddleware(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  beforeEach(async () => {
    await truncateAll(['identities', 'sessions', 'memberships', 'users', 'workspaces'])
    currentProfile = {
      providerAccountId: 'gh-1',
      email: 'octo@example.com',
      emailVerified: true,
      name: 'Octo Cat',
    }
  })

  it('lists the enabled provider on the public capabilities endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/auth/capabilities')

    expect(response.status).toBe(OK)
    expect(response.body.oauthProviders).toEqual([{ id: 'github', label: 'GitHub' }])
    expect(response.body.registrationEnabled).toBe(true)
  })

  it('redirects to the provider and sets a state cookie when beginning', async () => {
    const response = await request(app.getHttpServer()).get('/auth/oauth/github')

    expect(response.status).toBe(FOUND)
    expect(response.headers.location).toMatch(/^https:\/\/provider\.test\/authorize/)
    expect(cookieList(response.headers['set-cookie']).join(';')).toContain('kizunu_oauth_state=')
  })

  it('rejects a callback whose state does not match the cookie', async () => {
    const response = await request(app.getHttpServer()).get(
      '/auth/oauth/github/callback?code=x&state=forged',
    )

    expect(response.status).toBe(FOUND)
    expect(response.headers.location).toContain('/auth/login?error=oauth_state')
    expect(hasSessionCookie(response.headers['set-cookie'])).toBe(false)
  })

  it('signs in via the provider and lands an authenticated session', async () => {
    const agent = request.agent(app.getHttpServer())
    const begin = await agent.get('/auth/oauth/github')
    const state = readStateFromLocation(begin.headers.location)

    const callback = await agent.get(`/auth/oauth/github/callback?code=valid&state=${state}`)
    const me = await agent.get('/auth/me')

    expect(callback.status).toBe(FOUND)
    expect(callback.headers.location).toContain('/workspace')
    expect(hasSessionCookie(callback.headers['set-cookie'])).toBe(true)
    expect(me.status).toBe(OK)
    expect(me.body.user.email).toBe('octo@example.com')
    expect(me.body.user.emailVerifiedAt).not.toBeNull()
  })
})
