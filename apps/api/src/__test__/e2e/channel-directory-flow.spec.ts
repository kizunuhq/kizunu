import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ConnectMetaCoexUseCase } from '@kizunu/api/modules/channel/core/use-cases/connect-meta-coex.use-case'
import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const OK = 200
const NOT_FOUND = 404
const UNPROCESSABLE = 422
const META_BASE = 'https://graph.test/v21.0'

const owner = {
  email: 'owner@example.com',
  password: 'follow-up-2026',
  name: 'Owner',
}

const otherOwner = {
  email: 'other@example.com',
  password: 'follow-up-2026',
  name: 'Other',
}

interface FakeRoute {
  match: (url: string) => boolean
  status: number
  body?: unknown
}

function fakeMetaFetch(routes: FakeRoute[]): typeof fetch {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const match = routes.find((route) => route.match(url))
    if (!match) throw new Error(`Unexpected fetch call: ${url}`)
    return new Response(JSON.stringify(match.body ?? {}), {
      status: match.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  return fn as unknown as typeof fetch
}

function injectMetaFetch(app: INestApplication, fetchFn: typeof fetch): void {
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

const COEX_CONNECT_ROUTES: readonly FakeRoute[] = [
  {
    match: (url: string) => url.startsWith(`${META_BASE}/oauth/access_token`),
    status: 200,
    body: { access_token: 'biz-token-1', expires_in: 60 },
  },
  {
    match: (url: string) => url.endsWith('/waba-1/subscribed_apps'),
    status: 200,
    body: { success: true },
  },
]

describe('Channel directory (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(['channel_accounts', 'sessions', 'memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  async function bootstrap(
    profile = owner,
    extraRoutes: readonly FakeRoute[] = [],
  ): Promise<{
    agent: ReturnType<typeof request.agent>
    workspaceId: string
    accountId: string
  }> {
    injectMetaFetch(app, fakeMetaFetch([...COEX_CONNECT_ROUTES, ...extraRoutes]))
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(profile)
    const workspaceId = registration.body.workspace.id as string
    const accountResponse = await agent
      .post(`/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`)
      .send({
        code: 'auth-code',
        businessId: 'biz-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        name: 'WA',
      })
    expect(accountResponse.status).toBe(CREATED)
    return { agent, workspaceId, accountId: accountResponse.body.id as string }
  }

  it('returns the Meta template directory with the labeled rows', async () => {
    const { agent, workspaceId, accountId } = await bootstrap(owner, [
      {
        match: (url) =>
          url.includes('/waba-1/message_templates') && url.includes('status=APPROVED'),
        status: 200,
        body: {
          data: [{ name: 'welcome', language: 'en_US', status: 'APPROVED', category: 'MARKETING' }],
        },
      },
    ])

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/directory/templates`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0]).toMatchObject({ value: 'welcome', label: 'welcome' })
  })

  it('rejects with 422 when the resource is not supported by the plugin', async () => {
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/directory/mystery`,
    )

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('connector.directory-unsupported')
  })

  it('maps Meta 401 into connector.token-expired', async () => {
    const { agent, workspaceId, accountId } = await bootstrap(owner, [
      {
        match: (url) => url.includes('/waba-1/message_templates'),
        status: 401,
        body: { error: 'expired' },
      },
    ])

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/directory/templates`,
    )

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('connector.token-expired')
  })

  it('does not serve a channel account that belongs to a different workspace', async () => {
    const { accountId: foreignAccountId } = await bootstrap()
    const { agent, workspaceId } = await bootstrap(otherOwner)

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${foreignAccountId}/directory/templates`,
    )

    expect(response.status).toBe(NOT_FOUND)
  })
})
