import { Routes } from '@kizunu/api-contracts/routes'
import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  InviteMemberRequest,
  InviteMemberResponse,
  ListMembersResponse,
  UpdateMemberRequest,
  UpdateMemberResponse,
} from '@kizunu/api-contracts/workspace'

import { get, patch, post } from '../client/api-client'

export const inviteMember = (
  workspaceId: string,
  body: InviteMemberRequest,
): Promise<InviteMemberResponse> =>
  post<InviteMemberResponse>(Routes.workspaces.invite(workspaceId), body)

export const acceptInvitation = (
  body: AcceptInvitationRequest,
): Promise<AcceptInvitationResponse> =>
  post<AcceptInvitationResponse>(Routes.workspaces.acceptInvitation, body)

export const listMembers = (workspaceId: string): Promise<ListMembersResponse> =>
  get<ListMembersResponse>(Routes.workspaces.members(workspaceId))

export const updateMemberStatus = (
  workspaceId: string,
  membershipId: string,
  body: UpdateMemberRequest,
): Promise<UpdateMemberResponse> =>
  patch<UpdateMemberResponse>(Routes.workspaces.member(workspaceId, membershipId), body)
