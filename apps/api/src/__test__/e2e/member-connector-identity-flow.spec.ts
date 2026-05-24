import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

type SupertestAgent = ReturnType<typeof request.agent>

const CREATED = 201
const OK = 200
const NO_CONTENT = 204
const UNPROCESSABLE = 422
const NOT_FOUND = 404

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
  membershipId: string
  accountId: string
}> {
  const agent = request.agent(app.getHttpServer())
  const registration = await agent.post('/auth/register').send(admin)
  const workspaceId = registration.body.workspace.id
  const accountResponse = await agent
    .post(`/workspaces/${workspaceId}/connector-accounts`)
    .send(connector)
  expect(accountResponse.status).toBe(CREATED)
  const members = await agent.get(`/workspaces/${workspaceId}/members`)
  const membershipId = members.body.members[0].membershipId as string
  return { agent, workspaceId, membershipId, accountId: accountResponse.body.id }
}

describe('Member connector identity (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll([
      'member_connector_identities',
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

  it('creates a mapping and lists it under the connector account', async () => {
    const { agent, workspaceId, membershipId, accountId } = await bootstrap(app)

    const created = await agent
      .post(`/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`)
      .send({ membershipId, externalId: '99' })
    const list = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`,
    )

    expect(created.status).toBe(CREATED)
    expect(list.status).toBe(OK)
    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0]).toMatchObject({
      membershipId,
      externalId: '99',
      createdBy: expect.stringMatching(/^admin:/),
      sourceEmail: null,
    })
  })

  it('returns 422 owner.mapping-conflict when externalId is already taken on the account', async () => {
    const { agent, workspaceId, membershipId, accountId } = await bootstrap(app)
    await agent
      .post(`/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`)
      .send({ membershipId, externalId: '99' })

    const conflict = await agent
      .post(`/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`)
      .send({ membershipId, externalId: '99' })

    expect(conflict.status).toBe(UNPROCESSABLE)
    expect(conflict.body.code).toBe('owner.mapping-conflict')
  })

  it('updates a mapping (PATCH 204)', async () => {
    const { agent, workspaceId, membershipId, accountId } = await bootstrap(app)
    const created = await agent
      .post(`/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`)
      .send({ membershipId, externalId: '42' })

    const patch = await agent
      .patch(
        `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities/${created.body.id}`,
      )
      .send({ membershipId })

    expect(patch.status).toBe(NO_CONTENT)
  })

  it('removes a mapping so it no longer lists', async () => {
    const { agent, workspaceId, membershipId, accountId } = await bootstrap(app)
    const created = await agent
      .post(`/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`)
      .send({ membershipId, externalId: '42' })

    const removal = await agent.delete(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities/${created.body.id}`,
    )
    const list = await agent.get(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`,
    )

    expect(removal.status).toBe(NO_CONTENT)
    expect(list.body.items).toHaveLength(0)
  })

  it('returns 404 when deleting a non-existent mapping', async () => {
    const { agent, workspaceId, accountId } = await bootstrap(app)

    const removal = await agent.delete(
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities/00000000-0000-7000-8000-000000000000`,
    )

    expect(removal.status).toBe(NOT_FOUND)
  })
})
