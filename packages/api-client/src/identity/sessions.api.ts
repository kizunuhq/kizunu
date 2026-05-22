import type { SessionsResponse } from '@kizunu/api-contracts/identity'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get } from '../client/api-client'

export const getSessions = (): Promise<SessionsResponse> =>
  get<SessionsResponse>(Routes.auth.sessions)

export const revokeSession = (sessionId: string): Promise<void> =>
  del<void>(Routes.auth.session(sessionId))

export const revokeOtherSessions = (): Promise<void> => del<void>(Routes.auth.sessions)
