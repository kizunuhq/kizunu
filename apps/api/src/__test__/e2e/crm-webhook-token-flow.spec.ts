import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

type SupertestAgent = ReturnType<typeof request.agent>

const CREATED = 201
const OK = 200
const FORBIDDEN = 403

const admin = {
  email: 'admin@example.com',
  password: 'follow-up-2026',
  name: 'Admin',
}

const connector = {
  connectorId: 'pipedrive',
  name: 'Acme Pipedrive',
  credentials: { apiToken: 'tok', companyDomain: 'acme' },
}

async function bootstrap(app: INestApplication): Promise<{
  agent: SupertestAgent
  workspaceId: string
  accountId: string
}> {
  const agent = request.agent(app.getHttpServer())
  const registration = await agent.post('/auth/register').send(admin)
  const workspaceId = registration.body.workspace.id
  const accountResponse = await agent
    .post(`/workspaces/${workspaceId}/connector-accounts`)
    .send(connector)
  expect(accountResponse.status).toBe(CREATED)
  return { agent, workspaceId, accountId: accountResponse.body.id }
}

describe('CRM webhook token verification (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll([
      'lead_journeys',
      'leads',
      'connector_accounts',
      'sessions',
      'memberships',
      'users',
      'workspaces',
    ])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  it('rejects 403 when the token is missing', async () => {
    const { app: bootstrapped, accountId } = { app, ...(await bootstrap(app)) }

    const response = await request(bootstrapped.getHttpServer())
      .post(`/webhooks/crm/${accountId}`)
      .send({})

    expect(response.status).toBe(FORBIDDEN)
  })

  it('rejects 403 when the token is wrong', async () => {
    const { accountId } = await bootstrap(app)

    const response = await request(app.getHttpServer())
      .post(`/webhooks/crm/${accountId}?token=wrong-token`)
      .send({})

    expect(response.status).toBe(FORBIDDEN)
  })

  it('accepts 200 when no webhookToken is stored (legacy account)', async () => {
    const { accountId } = await bootstrap(app)
    // Strip the auto-generated webhookToken to simulate a pre-053 account.
    const { db } = await import('../integration/db')
    const { connectorAccounts } = await import('@kizunu/api/db/schemas/connector-accounts')
    const { eq } = await import('drizzle-orm')
    const rows = await db
      .select({ credentials: connectorAccounts.credentials })
      .from(connectorAccounts)
      .where(eq(connectorAccounts.id, accountId))
    expect(rows[0]?.credentials).toBeDefined()
    // The credentials are encrypted on disk; the simplest legacy simulation is to
    // overwrite the row with an un-encrypted credentials payload that lacks the
    // webhookToken (encryption boundary tolerates legacy plaintext per feature 030).
    await db
      .update(connectorAccounts)
      .set({ credentials: { apiToken: 'tok', companyDomain: 'acme', activityType: 'task' } })
      .where(eq(connectorAccounts.id, accountId))

    const response = await request(app.getHttpServer()).post(`/webhooks/crm/${accountId}`).send({})

    expect(response.status).toBe(OK)
  })
})
