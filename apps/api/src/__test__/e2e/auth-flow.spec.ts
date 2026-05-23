import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test'

import { closeDb, truncateAll } from '../integration/db'
import { createTestApp } from './create-test-app'

const CREATED = 201
const OK = 200
const NO_CONTENT = 204
const UNAUTHORIZED = 401

const credentials = {
  email: 'bdr@example.com',
  password: 'follow-up-2026',
  name: 'BDR One',
}

describe('Auth lifecycle (e2e)', () => {
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

  it('registers a user, creates a workspace, and returns the identity', async () => {
    const agent = request.agent(app.getHttpServer())

    const registration = await agent.post('/auth/register').send(credentials)

    expect(registration.status).toBe(CREATED)
    expect(registration.body.user.email).toBe(credentials.email)
    expect(registration.body.workspace.id).toBeDefined()
  })

  it('reads the current user from the session cookie set at registration', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)

    const me = await agent.get('/auth/me')

    expect(me.status).toBe(OK)
    expect(me.body.user.email).toBe(credentials.email)
    expect(me.body.memberships).toHaveLength(1)
    expect(me.body.activeWorkspaceId).toBe(me.body.memberships[0].workspaceId)
  })

  it('revokes the session on logout so the cookie no longer authenticates', async () => {
    const agent = request.agent(app.getHttpServer())
    await agent.post('/auth/register').send(credentials)

    const logout = await agent.post('/auth/logout')
    const meAfter = await agent.get('/auth/me')

    expect(logout.status).toBe(NO_CONTENT)
    expect(meAfter.status).toBe(UNAUTHORIZED)
  })

  it('logs back in with the same credentials and resolves the active workspace', async () => {
    const setup = request.agent(app.getHttpServer())
    await setup.post('/auth/register').send(credentials)
    await setup.post('/auth/logout')

    const agent = request.agent(app.getHttpServer())
    const login = await agent
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
    const me = await agent.get('/auth/me')

    expect(login.status).toBe(OK)
    expect(login.body.activeWorkspaceId).toBeDefined()
    expect(me.status).toBe(OK)
    expect(me.body.user.email).toBe(credentials.email)
  })

  it('rejects a login with the wrong password', async () => {
    const setup = request.agent(app.getHttpServer())
    await setup.post('/auth/register').send(credentials)

    const login = await request
      .agent(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })

    expect(login.status).toBe(UNAUTHORIZED)
  })
})
