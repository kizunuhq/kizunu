import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const OK = 200
const CREATED = 201
const UNPROCESSABLE = 422

const credentials = {
  email: 'bdr@example.com',
  password: 'follow-up-2026',
  name: 'BDR One',
}

describe('Registration gate (e2e)', () => {
  describe('open registration (default)', () => {
    let app: INestApplication

    beforeAll(async () => {
      app = await createTestApp()
    })

    beforeEach(async () => {
      await truncateAll(['sessions', 'memberships', 'users', 'workspaces'])
    })

    afterAll(async () => {
      await app.close()
    })

    it('reports registration enabled on the public capabilities endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/auth/capabilities')

      expect(response.status).toBe(OK)
      expect(response.body.registrationEnabled).toBe(true)
    })

    it('allows public registration', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(credentials)

      expect(response.status).toBe(CREATED)
    })
  })

  describe('gated registration', () => {
    let app: INestApplication
    const original = process.env.DISABLE_USER_REGISTRATION

    beforeAll(async () => {
      process.env.DISABLE_USER_REGISTRATION = 'true'
      app = await createTestApp()
    })

    afterAll(async () => {
      await app.close()
      if (original === undefined) delete process.env.DISABLE_USER_REGISTRATION
      else process.env.DISABLE_USER_REGISTRATION = original
    })

    afterEach(async () => {
      await truncateAll(['sessions', 'memberships', 'users', 'workspaces'])
    })

    it('reports registration disabled on the public capabilities endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/auth/capabilities')

      expect(response.status).toBe(OK)
      expect(response.body.registrationEnabled).toBe(false)
    })

    it('blocks public registration with a 422 business-rule error', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(credentials)

      expect(response.status).toBe(UNPROCESSABLE)
      expect(response.body.code).toBe('identity.registration-disabled')
    })
  })

  afterAll(async () => {
    await closeDb()
  })
})
