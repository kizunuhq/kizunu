import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { buildPipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const OK = 200
const UNPROCESSABLE = 422
const NOT_FOUND = 404
const PIPEDRIVE_BASE = 'https://api.pipedrive.test/v1'

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

describe('Connector health (e2e)', () => {
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

  async function bootstrap(): Promise<{
    agent: ReturnType<typeof request.agent>
    workspaceId: string
    accountId: string
  }> {
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    const workspaceId = registration.body.workspace.id as string
    const accountResponse = await agent.post(`/workspaces/${workspaceId}/connector-accounts`).send({
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'tok', companyDomain: 'acme' },
    })
    expect(accountResponse.status).toBe(CREATED)
    return { agent, workspaceId, accountId: accountResponse.body.id as string }
  }

  it('returns overall=ready when every Pipedrive check passes', async () => {
    injectPipedriveFetch(
      app,
      fakePipedriveFetch([
        {
          match: (url) => url.includes('/users/me'),
          status: 200,
          body: { data: { id: 1, email: 'owner@acme.com' } },
        },
        { match: (url) => url.includes('/pipelines'), status: 200, body: { data: [{ id: 1 }] } },
        { match: (url) => url.includes('/stages'), status: 200, body: { data: [{ id: 1 }] } },
        { match: (url) => url.includes('/dealFields'), status: 200, body: { data: [{ id: 1 }] } },
      ]),
    )
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/health`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.overall).toBe('ready')
    expect(response.body.checks).toHaveLength(6)
  })

  it('returns overall=unreachable when /users/me returns 401', async () => {
    injectPipedriveFetch(
      app,
      fakePipedriveFetch([
        { match: (url) => url.includes('/users/me'), status: 401, body: { error: 'bad' } },
        { match: (url) => url.includes('/pipelines'), status: 200, body: { data: [{ id: 1 }] } },
        { match: (url) => url.includes('/stages'), status: 200, body: { data: [{ id: 1 }] } },
        { match: (url) => url.includes('/dealFields'), status: 200, body: { data: [{ id: 1 }] } },
      ]),
    )
    const { agent, workspaceId, accountId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/health`,
    )

    expect(response.status).toBe(OK)
    expect(response.body.overall).toBe('unreachable')
  })

  it('returns 404 when the account is not in the workspace', async () => {
    const { agent, workspaceId } = await bootstrap()

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/00000000-0000-7000-8000-000000000000/health`,
    )

    expect(response.status).toBe(NOT_FOUND)
    expect(response.body.code).toBe('crm.account-not-found')
  })

  it('returns 422 crm.health-unsupported for a connector that omits the hook', async () => {
    // Build a minimal fake connector replacement that does NOT implement checkHealth.
    const { agent, workspaceId, accountId } = await bootstrap()
    const registry = app.get(CrmConnectorRegistry)
    const noHealth = buildPipedriveConnector({
      baseUrl: PIPEDRIVE_BASE,
      fetchFn: fakePipedriveFetch([]),
    })
    // Strip checkHealth for the duration of the test.
    const stripped = { ...noHealth, checkHealth: undefined }
    ;(
      registry as unknown as { connectors: Map<string, ReturnType<typeof buildPipedriveConnector>> }
    ).connectors.set('pipedrive', stripped as unknown as ReturnType<typeof buildPipedriveConnector>)

    const response = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/health`,
    )

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('crm.health-unsupported')
  })
})
