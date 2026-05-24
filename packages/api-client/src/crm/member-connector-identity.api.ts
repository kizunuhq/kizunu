import type {
  CreateMemberConnectorIdentityRequest,
  CreateMemberConnectorIdentityResponse,
  ListMemberConnectorIdentitiesResponse,
  UpdateMemberConnectorIdentityRequest,
} from '@kizunu/api-contracts/crm'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get, patch, post } from '../client/api-client'

export const listMemberConnectorIdentities = (
  workspaceId: string,
  connectorAccountId: string,
): Promise<ListMemberConnectorIdentitiesResponse> =>
  get<ListMemberConnectorIdentitiesResponse>(
    Routes.connectorAccounts.identities(workspaceId, connectorAccountId),
  )

export const createMemberConnectorIdentity = (
  workspaceId: string,
  connectorAccountId: string,
  body: CreateMemberConnectorIdentityRequest,
): Promise<CreateMemberConnectorIdentityResponse> =>
  post<CreateMemberConnectorIdentityResponse>(
    Routes.connectorAccounts.identities(workspaceId, connectorAccountId),
    body,
  )

export const updateMemberConnectorIdentity = (
  workspaceId: string,
  connectorAccountId: string,
  identityId: string,
  body: UpdateMemberConnectorIdentityRequest,
): Promise<void> =>
  patch<void>(Routes.connectorAccounts.identity(workspaceId, connectorAccountId, identityId), body)

export const deleteMemberConnectorIdentity = (
  workspaceId: string,
  connectorAccountId: string,
  identityId: string,
): Promise<void> =>
  del<void>(Routes.connectorAccounts.identity(workspaceId, connectorAccountId, identityId))
