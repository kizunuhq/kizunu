import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ConnectMetaCoexUseCase } from '@kizunu/api/modules/channel/core/use-cases/connect-meta-coex.use-case'
import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { buildCredentialsCipher } from '../integration/credentials-cipher'
import { closeDb, db, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const UNPROCESSABLE = 422
const META_BASE = 'https://graph.test/v21.0'

const owner = {
  email: 'admin@example.com',
  password: 'follow-up-2026',
  name: 'Workspace Admin',
}

interface FakeMetaRoute {
  match: (url: string, method: string) => boolean
  status: number
  body: unknown
}

function fakeMetaFetch(routes: FakeMetaRoute[]): typeof fetch {
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'
    const match = routes.find((route) => route.match(url, method))
    if (!match) {
      throw new Error(`Unexpected fetch call: ${method} ${url}`)
    }
    return new Response(JSON.stringify(match.body), {
      status: match.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  return fn as unknown as typeof fetch
}

describe('Meta Coex connect (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(['channel_accounts', 'memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  function injectFakeFetch(fetchFn: typeof fetch) {
    const registry = app.get(ChannelPluginRegistry)
    const replacement = new MetaWhatsappPlugin({
      baseUrl: META_BASE,
      fetchFn,
      config: { appId: 'fixture-app', appSecret: 'fixture-secret' },
    })
    ;(registry as unknown as { plugins: Map<string, unknown> }).plugins.set(
      'meta-whatsapp',
      replacement,
    )
    const useCase = app.get(ConnectMetaCoexUseCase)
    useCase.baseUrl = META_BASE
    useCase.fetchFn = fetchFn
  }

  async function registerOwner() {
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    return { agent, workspaceId: registration.body.workspace.id as string }
  }

  it('exchanges the code, runs the Coex subscription, and persists an encrypted Coex row', async () => {
    const fetchFn = fakeMetaFetch([
      {
        match: (url) => url.startsWith(`${META_BASE}/oauth/access_token`),
        status: 200,
        body: { access_token: 'biz-token-1', expires_in: 60 },
      },
      {
        match: (url) => url.endsWith('/waba-1/subscribed_apps'),
        status: 200,
        body: { success: true },
      },
    ])
    injectFakeFetch(fetchFn)

    const { agent, workspaceId } = await registerOwner()
    const response = await agent
      .post(`/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`)
      .send({
        code: 'auth-code',
        businessId: 'biz-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        name: 'WA Coex',
      })

    expect(response.status).toBe(CREATED)
    expect(response.body).toMatchObject({
      pluginId: 'meta-whatsapp',
      channelMode: 'coexistence',
      name: 'WA Coex',
    })

    const cipher = buildCredentialsCipher()
    const [row] = await db
      .select({ credentials: channelAccounts.credentials })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, response.body.id))
    expect(cipher.isEnvelope(row?.credentials)).toBe(true)
  })

  it('does not persist a row when Meta rejects the code exchange', async () => {
    const fetchFn = fakeMetaFetch([
      {
        match: (url) => url.startsWith(`${META_BASE}/oauth/access_token`),
        status: 400,
        body: { error: { message: 'invalid code' } },
      },
    ])
    injectFakeFetch(fetchFn)

    const { agent, workspaceId } = await registerOwner()
    const response = await agent
      .post(`/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`)
      .send({
        code: 'expired-code',
        businessId: 'biz-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        name: 'WA Coex',
      })

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('channel.meta-connect-failed')

    const rows = await db.select({ id: channelAccounts.id }).from(channelAccounts)
    expect(rows).toHaveLength(0)
  })
})
