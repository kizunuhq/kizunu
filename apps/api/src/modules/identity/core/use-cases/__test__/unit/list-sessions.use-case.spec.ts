import type { Session } from '@kizunu/api/db/schemas/sessions'
import { ListSessionsUseCase } from '@kizunu/api/modules/identity/core/use-cases/list-sessions.use-case'
import type { SessionRepository } from '@kizunu/api/modules/identity/persistence/session.repository'
import { describe, expect, it } from 'vite-plus/test'

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    tokenHash: 'hash',
    activeWorkspaceId: null,
    expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    revokedAt: null,
    lastSeenAt: new Date('2026-05-22T10:00:00.000Z'),
    userAgent: 'Firefox',
    ipAddress: '10.0.0.1',
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
    ...overrides,
  }
}

function buildUseCase(rows: Session[]): ListSessionsUseCase {
  const sessions = {
    listActiveForUser: async () => rows,
  } as unknown as SessionRepository

  return new ListSessionsUseCase(sessions)
}

describe('ListSessionsUseCase', () => {
  it('flags only the session matching the current session id', async () => {
    const useCase = buildUseCase([
      createSession({ id: 'session-1' }),
      createSession({ id: 'session-2' }),
    ])

    const result = await useCase.execute('user-1', 'session-2')

    expect(result.map((s) => ({ id: s.id, isCurrent: s.isCurrent }))).toEqual([
      { id: 'session-1', isCurrent: false },
      { id: 'session-2', isCurrent: true },
    ])
  })

  it('serializes timestamps to ISO strings', async () => {
    const useCase = buildUseCase([createSession()])

    const [view] = await useCase.execute('user-1', 'session-1')

    expect(view?.createdAt).toBe('2026-05-20T00:00:00.000Z')
    expect(view?.lastSeenAt).toBe('2026-05-22T10:00:00.000Z')
    expect(view?.expiresAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('passes a null last-seen through as null', async () => {
    const useCase = buildUseCase([createSession({ lastSeenAt: null })])

    const [view] = await useCase.execute('user-1', 'session-1')

    expect(view?.lastSeenAt).toBeNull()
  })
})
