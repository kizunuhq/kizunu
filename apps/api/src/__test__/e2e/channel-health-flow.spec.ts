import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { buildMetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const OK = 200
const NOT_FOUND = 404
const META_BASE = 'https://graph.test/v21.0'

const owner = {
  email: 'owner@example.com',
  password: 'follow-up-2026',
  name: 'Owner',
}

interface FakeRoute {
  match: (url: string) => boolean
  status: number
  body?: unknown
}

function fakeFetch(routes: FakeRoute[]): typeof fetch {
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

function injectFetch(app: INestApplication, fetchFn: typeof fetch): void {
  const registry = app.get(ChannelPluginRegistry)
  const replacement = buildMetaWhatsappPlugin({
    baseUrl: META_BASE,
    fetchFn,
    config: { appId: 'fixture-app', appSecret: 'fixture-secret' },
  })
  ;(registry as unknown as { plugins: Map<string, unknown> }).plugins.set(
    'meta-whatsapp',
    replacement,
  )
}

describe('Channel health (e2e)', () => {
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

  async function bootstrap(): Promise<{
    agent: ReturnType<typeof request.agent>
    workspaceId: string
    accountId: string
  }> {
    injectFetch(
      app,
      fakeFetch([
        {
          match: (url) => url.includes('/subscriptions'),
          status: 200,
          body: { success: true },
        },
        {
          match: (url) => url.includes('/subscribed_apps'),
          status: 200,
          body: { success: true },
        },
      ]),
    )
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    const workspaceId = registration.body.workspace.id as string
    const create = await agent.post(`/workspaces/${workspaceId}/channel-accounts`).send({
      pluginId: 'meta-whatsapp',
      name: 'Primary WA',
      credentials: {
        appId: 'app-1',
        appSecret: 'sec',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        systemToken: 'sys-tok',
      },
    })
    expect(create.status).toBe(CREATED)
    return { agent, workspaceId, accountId: create.body.id as string }
  }

  it('returns ready when every Meta check passes', async () => {
    const { agent, workspaceId, accountId } = await bootstrap()
    injectFetch(
      app,
      fakeFetch([
        { match: (url) => url.endsWith('/me'), status: 200, body: { id: 'me-1' } },
        { match: (url) => url.endsWith('/phone-1'), status: 200, body: { id: 'phone-1' } },
      ]),
    )

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/health`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.overall).toBe('ready')
  })

  it('returns unreachable when /me returns 401', async () => {
    const { agent, workspaceId, accountId } = await bootstrap()
    injectFetch(
      app,
      fakeFetch([
        { match: (url) => url.endsWith('/me'), status: 401, body: { error: 'bad' } },
        { match: (url) => url.endsWith('/phone-1'), status: 200, body: { id: 'phone-1' } },
      ]),
    )

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/health`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.overall).toBe('unreachable')
  })

  it('returns 404 when the account is not in the workspace', async () => {
    const { agent, workspaceId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/channel-accounts/00000000-0000-7000-8000-000000000000/health`,
    )

    expect(response.status).toBe(NOT_FOUND)
    expect(response.body.code).toBe('channel.account-not-found')
  })
})
