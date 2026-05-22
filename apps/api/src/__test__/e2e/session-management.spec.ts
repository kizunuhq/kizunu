import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { Agent } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const OK = 200
const NO_CONTENT = 204
const UNAUTHORIZED = 401
const UNPROCESSABLE = 422

const credentials = {
  email: 'bdr@example.com',
  password: 'follow-up-2026',
  name: 'BDR One',
}

// Signs in the same user a second time so the account has two live sessions
// (agent A from register, agent B from login), each with its own cookie jar.
async function signInSecondDevice(app: INestApplication): Promise<Agent> {
  const agent = request.agent(app.getHttpServer())
  await agent.post('/auth/login').send({ email: credentials.email, password: credentials.password })
  return agent
}

describe('Session management (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    await closeDb()
  })

  beforeEach(async () => {
    await truncateAll(['sessions', 'memberships', 'users', 'workspaces'])
  })

  it('lists the user active sessions and flags exactly the current one', async () => {
    const deviceA = request.agent(app.getHttpServer())
    await deviceA.post('/auth/register').send(credentials)
    await signInSecondDevice(app)

    const list = await deviceA.get('/auth/sessions')

    expect(list.status).toBe(OK)
    expect(list.body.sessions).toHaveLength(2)
    expect(list.body.sessions.filter((s: { isCurrent: boolean }) => s.isCurrent)).toHaveLength(1)
  })

  it('revokes a chosen session so its cookie no longer authenticates', async () => {
    const deviceA = request.agent(app.getHttpServer())
    await deviceA.post('/auth/register').send(credentials)
    const deviceB = await signInSecondDevice(app)
    const list = await deviceA.get('/auth/sessions')
    const other = list.body.sessions.find((s: { isCurrent: boolean }) => !s.isCurrent)

    const revoke = await deviceA.delete(`/auth/sessions/${other.id}`)
    const meB = await deviceB.get('/auth/me')
    const meA = await deviceA.get('/auth/me')

    expect(revoke.status).toBe(NO_CONTENT)
    expect(meB.status).toBe(UNAUTHORIZED)
    expect(meA.status).toBe(OK)
  })

  it('logs out every other session but keeps the current one', async () => {
    const deviceA = request.agent(app.getHttpServer())
    await deviceA.post('/auth/register').send(credentials)
    const deviceB = await signInSecondDevice(app)

    const revokeOthers = await deviceA.delete('/auth/sessions')
    const meB = await deviceB.get('/auth/me')
    const meA = await deviceA.get('/auth/me')

    expect(revokeOthers.status).toBe(NO_CONTENT)
    expect(meB.status).toBe(UNAUTHORIZED)
    expect(meA.status).toBe(OK)
  })

  it('rejects revoking a session the user does not own', async () => {
    const deviceA = request.agent(app.getHttpServer())
    await deviceA.post('/auth/register').send(credentials)

    const revoke = await deviceA.delete(`/auth/sessions/${crypto.randomUUID()}`)

    expect(revoke.status).toBe(UNPROCESSABLE)
    expect(revoke.body.code).toBe('identity.session-not-found')
  })
})
