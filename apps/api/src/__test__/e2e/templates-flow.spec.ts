import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

type SupertestAgent = ReturnType<typeof request.agent>

const CREATED = 201
const OK = 200
const NO_CONTENT = 204
const UNAUTHORIZED = 401

const owner = {
  email: 'admin@example.com',
  password: 'follow-up-2026',
  name: 'Workspace Admin',
}

const template = {
  name: 'Follow-up L1',
  channelPluginId: 'meta-whatsapp',
  providerTemplateName: 'follow_up_l1',
  language: 'pt_BR',
  variables: ['firstName'],
}

async function registerOwner(
  app: INestApplication,
): Promise<{ agent: SupertestAgent; workspaceId: string }> {
  const agent = request.agent(app.getHttpServer())
  const registration = await agent.post('/auth/register').send(owner)
  return { agent, workspaceId: registration.body.workspace.id }
}

describe('Workspace templates (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(['templates', 'sessions', 'memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  it('creates a template and lists it under the workspace', async () => {
    const { agent, workspaceId } = await registerOwner(app)

    const created = await agent.post(`/workspaces/${workspaceId}/templates`).send(template)
    const list = await agent.get(`/workspaces/${workspaceId}/templates`)

    expect(created.status).toBe(CREATED)
    expect(list.status).toBe(OK)
    expect(list.body.templates).toHaveLength(1)
    expect(list.body.templates[0].providerTemplateName).toBe('follow_up_l1')
  })

  it('removes a template so it no longer lists', async () => {
    const { agent, workspaceId } = await registerOwner(app)
    const created = await agent.post(`/workspaces/${workspaceId}/templates`).send(template)

    const removal = await agent.delete(`/workspaces/${workspaceId}/templates/${created.body.id}`)
    const list = await agent.get(`/workspaces/${workspaceId}/templates`)

    expect(removal.status).toBe(NO_CONTENT)
    expect(list.body.templates).toHaveLength(0)
  })

  it('rejects an unauthenticated request to the workspace surface', async () => {
    const { workspaceId } = await registerOwner(app)

    const list = await request
      .agent(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/templates`)

    expect(list.status).toBe(UNAUTHORIZED)
  })
})
