import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { createTestApp } from './create-test-app'

const TOO_MANY_REQUESTS = 429
const AUTH_LIMIT = 10

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 429 once the login attempt limit is exceeded', async () => {
    const server = app.getHttpServer()
    let lastStatus = 0
    for (let attempt = 0; attempt <= AUTH_LIMIT; attempt++) {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' })
      lastStatus = response.status
    }

    expect(lastStatus).toBe(TOO_MANY_REQUESTS)
  })
})
