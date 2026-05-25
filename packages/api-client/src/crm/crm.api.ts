import type {
  ConnectorHealth,
  CreateConnectorAccountRequest,
  CreateConnectorAccountResponse,
  DryRunDealRequest,
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

export const getConnectorHealth = (
  workspaceId: string,
  accountId: string,
): Promise<ConnectorHealth> =>
  get<ConnectorHealth>(Routes.connectorAccounts.health(workspaceId, accountId))

export const dryRunDeal = (
  workspaceId: string,
  accountId: string,
  body: DryRunDealRequest,
): Promise<ConnectorHealth> =>
  post<ConnectorHealth>(Routes.connectorAccounts.dryRun(workspaceId, accountId), body)
