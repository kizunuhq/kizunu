import type {
  ChannelPluginsResponse,
  ConnectMetaCoexRequest,
  ConnectMetaCoexResponse,
  CreateChannelAccountRequest,
  CreateChannelAccountResponse,
  GrantChannelAccessRequest,
  ListChannelAccountsResponse,
  MyChannelsResponse,
} from '@kizunu/api-contracts/channel'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get, patch, post } from '../client/api-client'

export const createChannelAccount = (
  workspaceId: string,
  body: CreateChannelAccountRequest,
): Promise<CreateChannelAccountResponse> =>
  post<CreateChannelAccountResponse>(Routes.channelAccounts.collection(workspaceId), body)

export const listChannelAccounts = (workspaceId: string): Promise<ListChannelAccountsResponse> =>
  get<ListChannelAccountsResponse>(Routes.channelAccounts.collection(workspaceId))

export const grantChannelAccess = (
  workspaceId: string,
  accountId: string,
  body: GrantChannelAccessRequest,
): Promise<void> => post<void>(Routes.channelAccounts.access(workspaceId, accountId), body)

export const revokeChannelAccess = (
  workspaceId: string,
  accountId: string,
  userId: string,
): Promise<void> => del<void>(Routes.channelAccounts.accessMember(workspaceId, accountId, userId))

export const listMyChannels = (): Promise<MyChannelsResponse> =>
  get<MyChannelsResponse>(Routes.channels.mine)

export const setPrimaryChannel = (accountId: string): Promise<void> =>
  patch<void>(Routes.channels.primary(accountId))

export const listChannelPlugins = (): Promise<ChannelPluginsResponse> =>
  get<ChannelPluginsResponse>(Routes.channels.plugins)

export const connectMetaCoex = (
  workspaceId: string,
  body: ConnectMetaCoexRequest,
): Promise<ConnectMetaCoexResponse> =>
  post<ConnectMetaCoexResponse>(Routes.channelAccounts.connectMetaCoex(workspaceId), body)
