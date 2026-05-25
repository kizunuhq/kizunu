import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ConnectMetaCoexUseCase } from '@kizunu/api/modules/channel/core/use-cases/connect-meta-coex.use-case'
import { buildMetaWhatsappCoexPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp-coex/meta-whatsapp-coex.plugin'
import { buildMetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const OK = 200
const CREATED = 201
const META_BASE = 'https://graph.test/v21.0'

const owner = {
  email: 'coex-owner@example.com',
  password: 'follow-up-2026',
  name: 'Coex Owner',
}

function fakeMetaFetch(): typeof fetch {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('/oauth/access_token')) {
      return new Response(
        JSON.stringify({ access_token: 'fake-coex-token', expires_in: 5_184_000 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/subscribed_apps')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error(`Unexpected fetch call: ${url}`)
  })
  return fn as unknown as typeof fetch
}

function injectFakeFetch(app: INestApplication, fetchFn: typeof fetch): void {
  const registry = app.get(ChannelPluginRegistry)
  const plugins = (registry as unknown as { plugins: Map<string, unknown> }).plugins
  plugins.set(
    'meta-whatsapp',
    buildMetaWhatsappPlugin({
      baseUrl: META_BASE,
      fetchFn,
      config: { appId: 'fixture-app', appSecret: 'fixture-secret' },
    }),
  )
  plugins.set(
    'meta-whatsapp-coex',
    buildMetaWhatsappCoexPlugin({
      baseUrl: META_BASE,
      fetchFn,
      config: { appId: 'fixture-app', appSecret: 'fixture-secret' },
    }),
  )
  const useCase = app.get(ConnectMetaCoexUseCase)
  useCase.baseUrl = META_BASE
  useCase.fetchFn = fetchFn
}

const inboundPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: 'phone-coex-1' },
            messages: [
              {
                id: 'wamid.coex-1',
                from: '5511988887777',
                timestamp: '1700000000',
                text: { body: 'hello coex' },
              },
            ],
          },
        },
      ],
    },
  ],
}

describe('Meta Coex onboarding flow (e2e)', () => {
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

  async function registerAndConnect(): Promise<{
    agent: ReturnType<typeof request.agent>
    workspaceId: string
    accountId: string
  }> {
    injectFakeFetch(app, fakeMetaFetch())
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    const workspaceId = registration.body.workspace.id as string
    const connectResponse = await agent
      .post(`/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`)
      .send({
        code: 'coex-auth-code',
        businessId: 'biz-coex',
        wabaId: 'waba-coex',
        phoneNumberId: 'phone-coex-1',
        name: 'WA Coex Account',
      })
    expect(connectResponse.status).toBe(CREATED)
    return { agent, workspaceId, accountId: connectResponse.body.id as string }
  }

  it('lists meta-whatsapp with connect.kind=credentials and meta-whatsapp-coex with connect.kind=oauth', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(owner)

    const response = await agent.get('/channel-plugins')

    expect(response.status).toBe(OK)

    const cloudApi = response.body.plugins.find(
      (plugin: { id: string }) => plugin.id === 'meta-whatsapp',
    )
    expect(cloudApi.connect).toEqual({ kind: 'credentials' })

    const coex = response.body.plugins.find(
      (plugin: { id: string }) => plugin.id === 'meta-whatsapp-coex',
    )
    expect(coex.connect).toEqual({ kind: 'oauth', provider: 'meta-coex' })
  })

  it('connect endpoint returns pluginId=meta-whatsapp-coex and channelMode=coexistence', async () => {
    injectFakeFetch(app, fakeMetaFetch())
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    const workspaceId = registration.body.workspace.id as string

    const response = await agent
      .post(`/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`)
      .send({
        code: 'coex-auth-code',
        businessId: 'biz-coex',
        wabaId: 'waba-coex',
        phoneNumberId: 'phone-coex-1',
        name: 'WA Coex Account',
      })

    expect(response.status).toBe(CREATED)
    expect(response.body).toMatchObject({
      pluginId: 'meta-whatsapp-coex',
      channelMode: 'coexistence',
      name: 'WA Coex Account',
    })
  })

  it('webhook POST against the coex row dispatches through parseInbound and returns received count', async () => {
    const { accountId } = await registerAndConnect()

    const response = await request(app.getHttpServer())
      .post(`/webhooks/meta/${accountId}`)
      .send(inboundPayload)

    expect(response.status).toBe(OK)
    expect(response.body).toEqual({ received: 1 })
  })
})
