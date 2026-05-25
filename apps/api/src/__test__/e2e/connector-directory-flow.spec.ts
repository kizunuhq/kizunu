import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { buildPipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const OK = 200
const NOT_FOUND = 404
const UNPROCESSABLE = 422
const PIPEDRIVE_BASE = 'https://acme.pipedrive.test/api/v1'

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

function fakePipedriveFetch(routes: FakeRoute[]): typeof fetch {
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

function injectPipedriveFetch(app: INestApplication, fetchFn: typeof fetch): void {
  const registry = app.get(CrmConnectorRegistry)
  const replacement = buildPipedriveConnector({ baseUrl: PIPEDRIVE_BASE, fetchFn })
  ;(
    registry as unknown as { connectors: Map<string, ReturnType<typeof buildPipedriveConnector>> }
  ).connectors.set('pipedrive', replacement)
}

describe('CRM directory (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(['connector_accounts', 'sessions', 'memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  async function bootstrap(profile = owner): Promise<{
    agent: ReturnType<typeof request.agent>
    workspaceId: string
    accountId: string
  }> {
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(profile)
    const workspaceId = registration.body.workspace.id as string
    const accountResponse = await agent.post(`/workspaces/${workspaceId}/connector-accounts`).send({
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'tok', companyDomain: 'acme' },
    })
    expect(accountResponse.status).toBe(CREATED)
    return { agent, workspaceId, accountId: accountResponse.body.id as string }
  }

  it('returns the Pipedrive user directory through the labeled rows', async () => {
    injectPipedriveFetch(
      app,
      fakePipedriveFetch([
        {
          match: (url) => url.includes(`${PIPEDRIVE_BASE}/users`),
          status: 200,
          body: {
            data: [
              { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', active_flag: true },
              { id: 2, name: 'Grace Hopper', email: 'grace@example.com', active_flag: false },
            ],
          },
        },
      ]),
    )
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/directory/users`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.items).toHaveLength(2)
    expect(response.body.items[0]).toMatchObject({
      value: '1',
      label: 'Ada Lovelace <ada@example.com>',
    })
    expect(response.body.meta).toEqual({ truncated: false })
  })

  it('rejects with 422 when the resource is not supported by the connector', async () => {
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/directory/mystery`,
    )

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('connector.directory-unsupported')
  })

  it('maps provider 401 into connector.token-expired', async () => {
    injectPipedriveFetch(
      app,
      fakePipedriveFetch([
        {
          match: (url) => url.includes('/users'),
          status: 401,
          body: { error: 'expired' },
        },
      ]),
    )
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/directory/users`,
    )

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('connector.token-expired')
  })

  it('does not serve a connector account that belongs to a different workspace', async () => {
    const { accountId: foreignAccountId } = await bootstrap()
    const { agent, workspaceId } = await bootstrap(otherOwner)

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${foreignAccountId}/directory/users`,
    )

    expect(response.status).toBe(NOT_FOUND)
  })
})
