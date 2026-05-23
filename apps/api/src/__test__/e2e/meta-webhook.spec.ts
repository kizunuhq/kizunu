import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, db, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const OK = 200
const FORBIDDEN = 403
const NOT_FOUND = 404
const META_PLUGIN_ID = 'meta-whatsapp'

async function seedAccount(verifyToken: string): Promise<{ workspaceId: string; id: string }> {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'WA pilot', slug: 'wa-pilot' })
    .returning({ id: workspaces.id })
  if (!workspace) throw new Error('seed workspace failed')

  const [account] = await db
    .insert(channelAccounts)
    .values({
      workspaceId: workspace.id,
      pluginId: META_PLUGIN_ID,
      name: 'WA primary',
      credentials: {
        channelMode: 'cloud_api',
        appId: 'app-1',
        appSecret: 'app-secret-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        systemToken: 'system-token-1',
        verifyToken,
      },
    })
    .returning({ id: channelAccounts.id })
  if (!account) throw new Error('seed channel account failed')

  return { workspaceId: workspace.id, id: account.id }
}

describe('Meta inbound webhook (e2e)', () => {
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

  it('echoes hub.challenge when the supplied verify_token matches the row', async () => {
    const seeded = await seedAccount('right-token')

    const response = await request(app.getHttpServer()).get(`/webhooks/meta/${seeded.id}`).query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'right-token',
      'hub.challenge': 'ping',
    })

    expect(response.status).toBe(OK)
    expect(response.text).toBe('ping')
  })

  it('responds 403 on a token mismatch', async () => {
    const seeded = await seedAccount('right-token')

    const response = await request(app.getHttpServer())
      .get(`/webhooks/meta/${seeded.id}`)
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'ping' })

    expect(response.status).toBe(FORBIDDEN)
  })

  it('responds 404 on an unknown channelAccountId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/webhooks/meta/00000000-0000-0000-0000-000000000000`)
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'any', 'hub.challenge': 'ping' })

    expect(response.status).toBe(NOT_FOUND)
  })

  it('parses an inbound POST and acknowledges the parsed-message count', async () => {
    const seeded = await seedAccount('right-token')

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'phone-1' },
                messages: [
                  {
                    id: 'wamid.1',
                    from: '5511999',
                    timestamp: '1700000000',
                    text: { body: 'hi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const response = await request(app.getHttpServer())
      .post(`/webhooks/meta/${seeded.id}`)
      .send(payload)

    expect(response.status).toBe(OK)
    expect(response.body).toEqual({ received: 1 })
  })

  it('refuses the legacy `/webhooks/meta` route after the per-channel cutover', async () => {
    const response = await request(app.getHttpServer())
      .get('/webhooks/meta')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'any', 'hub.challenge': 'ping' })

    expect(response.status).toBe(NOT_FOUND)
  })
})
