/**
 * Canonical REST route table. Endpoints are declared here once, in the same
 * package that owns their request/response schemas, so the client and the API
 * never drift on a path. Parameterized routes are functions; static routes are
 * strings. Paths are relative to the API origin (no version prefix).
 */
export const Routes = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    switchWorkspace: '/auth/switch-workspace',
  },
  workspaces: {
    invite: (workspaceId: string) => `/workspaces/${workspaceId}/invitations`,
    acceptInvitation: '/workspaces/invitations/accept',
    members: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
    member: (workspaceId: string, membershipId: string) =>
      `/workspaces/${workspaceId}/members/${membershipId}`,
  },
  channelAccounts: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/channel-accounts`,
    access: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/access`,
    accessMember: (workspaceId: string, accountId: string, userId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/access/${userId}`,
  },
  channels: {
    mine: '/channel-accounts/mine',
    primary: (accountId: string) => `/channel-accounts/${accountId}/primary`,
    plugins: '/channel-plugins',
  },
  connectorAccounts: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/connector-accounts`,
  },
} as const
