/**
 * Maps a workspace member to a connector-side user identity (e.g. a Pipedrive
 * user id), scoped to one ConnectorAccount. Two uniqueness rules: a single
 * external id maps to one member per account, and a single member has one
 * external id per account. Auto-created by ResolveOwnerService on first ingest
 * when the owner email matches a verified-active member; otherwise created by
 * an admin via the workspace API.
 */
export interface MemberConnectorIdentity {
  id: string
  workspaceId: string
  membershipId: string
  connectorAccountId: string
  externalId: string
  createdBy: string
  sourceEmail: string | null
  createdAt: Date
  updatedAt: Date
}
