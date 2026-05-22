/**
 * Canonical REST route table. Endpoints are declared here once, in the same
 * package that owns their request/response schemas, so the client and the API
 * never drift on a path. Parameterized routes are functions; static routes are
 * strings. Paths are relative to the API origin (no version prefix).
 */
export const Routes = {
  auth: {
    capabilities: '/auth/capabilities',
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    switchWorkspace: '/auth/switch-workspace',
    passwordReset: '/auth/password-reset',
    passwordResetConfirm: '/auth/password-reset/confirm',
    emailVerification: '/auth/email-verification',
    emailVerificationConfirm: '/auth/email-verification/confirm',
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
  templates: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/templates`,
    item: (workspaceId: string, templateId: string) =>
      `/workspaces/${workspaceId}/templates/${templateId}`,
  },
  cadences: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/cadences`,
    item: (workspaceId: string, cadenceId: string) =>
      `/workspaces/${workspaceId}/cadences/${cadenceId}`,
  },
  entryTriggers: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/entry-triggers`,
    item: (workspaceId: string, triggerId: string) =>
      `/workspaces/${workspaceId}/entry-triggers/${triggerId}`,
  },
  leadJourneys: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/lead-journeys`,
  },
  leadOwnership: {
    pauseJourneys: (workspaceId: string, userId: string) =>
      `/workspaces/${workspaceId}/owners/${userId}/pause-journeys`,
    reassign: (workspaceId: string) => `/workspaces/${workspaceId}/lead-reassignments`,
  },
  webhooks: {
    crm: (connectorAccountId: string) => `/webhooks/crm/${connectorAccountId}`,
    meta: '/webhooks/meta',
  },
} as const
