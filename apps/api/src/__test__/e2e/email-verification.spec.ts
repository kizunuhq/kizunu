import { Logger } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { MockInstance } from 'vite-plus/test'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const NO_CONTENT = 204
const UNAUTHORIZED = 401
const UNPROCESSABLE = 422

const credentials = {
  email: 'bdr@example.com',
  password: 'follow-up-2026',
  name: 'BDR One',
}

// The raw verification token never returns over HTTP — it only travels in the
// out-of-band mail. ConsoleMailSender logs the body, so the e2e reads the token
// from the captured log, exactly as a user would read it from their inbox.
function extractVerifyToken(logSpy: MockInstance): string {
  for (const call of logSpy.mock.calls) {
    const match = String(call[0]).match(/verify-email\?token=([^\s]+)/)
    if (match?.[1]) return match[1]
  }
  throw new Error('no verification token was mailed')
}

function mailedAnotherVerifyLink(logSpy: MockInstance): boolean {
  return logSpy.mock.calls.some((call) => String(call[0]).includes('verify-email?token='))
}

describe('Email verification (e2e)', () => {
  let app: INestApplication
  let logSpy: MockInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  beforeEach(async () => {
    await truncateAll(['verification_tokens', 'sessions', 'memberships', 'users', 'workspaces'])
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('mails a verify link on register and confirming it marks the email verified', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)
    const token = extractVerifyToken(logSpy)

    const confirm = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({ token })
    const me = await agent.get('/auth/me')

    expect(confirm.status).toBe(NO_CONTENT)
    expect(me.body.user.emailVerifiedAt).not.toBeNull()
  })

  it('rejects replaying a consumed verification token', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)
    const token = extractVerifyToken(logSpy)
    await request(app.getHttpServer()).post('/auth/email-verification/confirm').send({ token })

    const replay = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({ token })

    expect(replay.status).toBe(UNPROCESSABLE)
    expect(replay.body.code).toBe('identity.invalid-verification-token')
  })

  it('rejects a resend without a session', async () => {
    const resend = await request(app.getHttpServer()).post('/auth/email-verification')

    expect(resend.status).toBe(UNAUTHORIZED)
  })

  it('resends a verification link for a signed-in unverified user', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)
    logSpy.mockClear()

    const resend = await agent.post('/auth/email-verification')

    expect(resend.status).toBe(NO_CONTENT)
    expect(mailedAnotherVerifyLink(logSpy)).toBe(true)
  })

  it('is a no-op resend once the user is already verified', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)
    const token = extractVerifyToken(logSpy)
    await request(app.getHttpServer()).post('/auth/email-verification/confirm').send({ token })
    logSpy.mockClear()

    const resend = await agent.post('/auth/email-verification')

    expect(resend.status).toBe(NO_CONTENT)
    expect(mailedAnotherVerifyLink(logSpy)).toBe(false)
  })
})
