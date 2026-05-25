import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { buildPipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { buildCredentialsCipher } from '../integration/credentials-cipher'
import { closeDb, db, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const UNPROCESSABLE = 422
const PIPEDRIVE_BASE = 'https://api.pipedrive.test'

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

function injectPipedriveFetch(
  app: INestApplication,
  fetchFn: typeof fetch,
): { fetchFn: ReturnType<typeof fakePipedriveFetch> } {
  const registry = app.get(CrmConnectorRegistry)
  const replacement = buildPipedriveConnector({ baseUrl: PIPEDRIVE_BASE, fetchFn })
  ;(
    registry as unknown as { connectors: Map<string, ReturnType<typeof buildPipedriveConnector>> }
  ).connectors.set('pipedrive', replacement)
  return { fetchFn }
}

async function readStoredCredentials(accountId: string): Promise<Record<string, unknown> | null> {
  const cipher = buildCredentialsCipher()
  const [row] = await db
    .select({ credentials: connectorAccounts.credentials })
    .from(connectorAccounts)
    .where(eq(connectorAccounts.id, accountId))
  if (!row) return null
  return cipher.decrypt(row.credentials) as Record<string, unknown>
}

describe('Token-first Pipedrive connector setup (e2e)', () => {
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

  async function registerOwner() {
    const agent = request.agent(app.getHttpServer())
    const registration = await agent.post('/auth/register').send(owner)
    return { agent, workspaceId: registration.body.workspace.id as string }
  }

  it('derives companyDomain from /users/me when the operator omits it', async () => {
    const fetchFn = fakePipedriveFetch([
      {
        match: (url) => url.includes(`${PIPEDRIVE_BASE}/users/me`),
        status: 200,
        body: { data: { id: 1, name: 'Owner', company_domain: 'auto-acme' } },
      },
    ])
    injectPipedriveFetch(app, fetchFn)

    const { agent, workspaceId } = await registerOwner()
    const response = await agent.post(`/workspaces/${workspaceId}/connector-accounts`).send({
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'paste-only-tok' },
    })

    expect(response.status).toBe(CREATED)
    const stored = await readStoredCredentials(response.body.id as string)
    expect(stored).toMatchObject({
      apiToken: 'paste-only-tok',
      companyDomain: 'auto-acme',
      activityType: 'task',
    })
    expect(stored?.['webhookToken']).toBeTypeOf('string')
  })

  it('rejects with 422 crm.token-invalid when /users/me returns 401', async () => {
    const fetchFn = fakePipedriveFetch([
      {
        match: (url) => url.includes(`${PIPEDRIVE_BASE}/users/me`),
        status: 401,
        body: { error: 'bad token' },
      },
    ])
    injectPipedriveFetch(app, fetchFn)

    const { agent, workspaceId } = await registerOwner()
    const response = await agent.post(`/workspaces/${workspaceId}/connector-accounts`).send({
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'bad-tok' },
    })

    expect(response.status).toBe(UNPROCESSABLE)
    expect(response.body.code).toBe('crm.token-invalid')
    const rows = await db.select({ id: connectorAccounts.id }).from(connectorAccounts)
    expect(rows).toHaveLength(0)
  })

  it('honors a manual companyDomain override without calling /users/me', async () => {
    const fetchFn = fakePipedriveFetch([
      {
        match: () => true,
        status: 500,
        body: { error: 'should-not-be-called' },
      },
    ])
    const { fetchFn: spy } = injectPipedriveFetch(app, fetchFn)

    const { agent, workspaceId } = await registerOwner()
    const response = await agent.post(`/workspaces/${workspaceId}/connector-accounts`).send({
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'paste-tok', companyDomain: 'custom-host' },
    })

    expect(response.status).toBe(CREATED)
    expect(spy).not.toHaveBeenCalled()
    const stored = await readStoredCredentials(response.body.id as string)
    expect(stored?.['companyDomain']).toBe('custom-host')
  })
})
