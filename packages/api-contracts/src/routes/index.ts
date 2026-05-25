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
    sessions: '/auth/sessions',
    session: (sessionId: string) => `/auth/sessions/${sessionId}`,
    oauthBegin: (provider: string) => `/auth/oauth/${provider}`,
  },
  workspaces: {
    invite: (workspaceId: string) => `/workspaces/${workspaceId}/invitations`,
    acceptInvitation: '/workspaces/invitations/accept',
    members: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
    member: (workspaceId: string, membershipId: string) =>
      `/workspaces/${workspaceId}/members/${membershipId}`,
    routingReadiness: (workspaceId: string) => `/workspaces/${workspaceId}/routing-readiness`,
  },
  channelAccounts: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/channel-accounts`,
    access: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/access`,
    accessMember: (workspaceId: string, accountId: string, userId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/access/${userId}`,
    connectMetaCoex: (workspaceId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/meta-whatsapp/connect`,
    directory: (workspaceId: string, accountId: string, resource: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/directory/${resource}`,
    health: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/channel-accounts/${accountId}/health`,
  },
  channels: {
    mine: '/channel-accounts/mine',
    primary: (accountId: string) => `/channel-accounts/${accountId}/primary`,
    plugins: '/channel-plugins',
  },
  connectors: {
    list: '/connectors',
  },
  connectorAccounts: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/connector-accounts`,
    identities: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities`,
    identity: (workspaceId: string, accountId: string, identityId: string) =>
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/identities/${identityId}`,
    directory: (workspaceId: string, accountId: string, resource: string) =>
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/directory/${resource}`,
    health: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/health`,
    dryRun: (workspaceId: string, accountId: string) =>
      `/workspaces/${workspaceId}/connector-accounts/${accountId}/dry-run`,
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
  auditEvents: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/audit-events`,
  },
  leadJourneys: {
    collection: (workspaceId: string) => `/workspaces/${workspaceId}/lead-journeys`,
    pause: (workspaceId: string, journeyId: string) =>
      `/workspaces/${workspaceId}/lead-journeys/${journeyId}/pause`,
    resume: (workspaceId: string, journeyId: string) =>
      `/workspaces/${workspaceId}/lead-journeys/${journeyId}/resume`,
    stop: (workspaceId: string, journeyId: string) =>
      `/workspaces/${workspaceId}/lead-journeys/${journeyId}/stop`,
    pauseAll: (workspaceId: string) => `/workspaces/${workspaceId}/lead-journeys/pause-all`,
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
