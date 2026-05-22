import type { ReassignLeadsRequest } from '@kizunu/api-contracts/engine'
import { Routes } from '@kizunu/api-contracts/routes'

import { post } from '../client/api-client'

export const pauseOwnerJourneys = (workspaceId: string, userId: string): Promise<void> =>
  post<void>(Routes.leadOwnership.pauseJourneys(workspaceId, userId))

export const reassignLeads = (workspaceId: string, body: ReassignLeadsRequest): Promise<void> =>
  post<void>(Routes.leadOwnership.reassign(workspaceId), body)
