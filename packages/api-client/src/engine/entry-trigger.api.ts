import type {
  CreateEntryTriggerRequest,
  CreateEntryTriggerResponse,
  ListEntryTriggersResponse,
} from '@kizunu/api-contracts/engine'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get, post } from '../client/api-client'

export const createEntryTrigger = (
  workspaceId: string,
  body: CreateEntryTriggerRequest,
): Promise<CreateEntryTriggerResponse> =>
  post<CreateEntryTriggerResponse>(Routes.entryTriggers.collection(workspaceId), body)

export const listEntryTriggers = (workspaceId: string): Promise<ListEntryTriggersResponse> =>
  get<ListEntryTriggersResponse>(Routes.entryTriggers.collection(workspaceId))

export const deleteEntryTrigger = (workspaceId: string, triggerId: string): Promise<void> =>
  del<void>(Routes.entryTriggers.item(workspaceId, triggerId))
