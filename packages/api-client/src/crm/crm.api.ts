import type {
  CreateConnectorAccountRequest,
  CreateConnectorAccountResponse,
  ListAvailableConnectorsResponse,
  ListConnectorAccountsResponse,
} from '@kizunu/api-contracts/crm'
import { Routes } from '@kizunu/api-contracts/routes'

import { get, post } from '../client/api-client'

export const createConnectorAccount = (
  workspaceId: string,
  body: CreateConnectorAccountRequest,
): Promise<CreateConnectorAccountResponse> =>
  post<CreateConnectorAccountResponse>(Routes.connectorAccounts.collection(workspaceId), body)

export const listConnectorAccounts = (
  workspaceId: string,
): Promise<ListConnectorAccountsResponse> =>
  get<ListConnectorAccountsResponse>(Routes.connectorAccounts.collection(workspaceId))

export const listAvailableConnectors = (): Promise<ListAvailableConnectorsResponse> =>
  get<ListAvailableConnectorsResponse>(Routes.connectors.list)
