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
} as const
