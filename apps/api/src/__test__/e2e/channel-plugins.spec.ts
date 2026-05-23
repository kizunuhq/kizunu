import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const OK = 200

const owner = {
  email: 'admin@example.com',
  password: 'follow-up-2026',
  name: 'Workspace Admin',
}

// e2e: the web app reads channel-plugins (as the authenticated admin) to render the
// credential form, so the descriptor must survive the type-safe boundary to the wire.
describe('Channel plugins (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await truncateAll(['sessions', 'memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  it('exposes the Meta plugin credential fields with their types and required flags', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(owner)

    const response = await agent.get('/channel-plugins')

    expect(response.status).toBe(OK)
    const meta = response.body.plugins.find(
      (plugin: { id: string }) => plugin.id === 'meta-whatsapp',
    )
    expect(meta.credentialFields).toEqual([
      { key: 'appId', label: 'Meta App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'Meta App Secret', type: 'secret', required: true },
      { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
      { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
      { key: 'systemToken', label: 'System token', type: 'secret', required: true },
      {
        key: 'verifyToken',
        label: 'Verify token',
        type: 'secret',
        required: true,
        serverGenerated: true,
      },
    ])
  })
})
