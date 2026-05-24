import type { GetChannelDirectoryResponse } from '@kizunu/api-contracts/channel'
import { Routes } from '@kizunu/api-contracts/routes'

import { get } from '../client/api-client'

export const getChannelDirectory = (
  workspaceId: string,
  accountId: string,
  resource: string,
  params?: Record<string, string>,
): Promise<GetChannelDirectoryResponse> =>
  get<GetChannelDirectoryResponse>(
    Routes.channelAccounts.directory(workspaceId, accountId, resource),
    params,
  )
