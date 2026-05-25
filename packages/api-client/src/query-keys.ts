/**
 * Stable TanStack Query cache keys. One namespace per resource; hooks compose
 * these with parameters (`[QueryKeys.members, workspaceId]`) so invalidation
 * stays predictable across the client.
 */
export const QueryKeys = Object.freeze({
  currentUser: 'currentUser',
  authCapabilities: 'authCapabilities',
  sessions: 'sessions',
  members: 'members',
  workspaceChannels: 'workspaceChannels',
  myChannels: 'myChannels',
  channelPlugins: 'channelPlugins',
  availableConnectors: 'availableConnectors',
  workspaceConnectors: 'workspaceConnectors',
  memberConnectorIdentities: 'memberConnectorIdentities',
  workspaceTemplates: 'workspaceTemplates',
  workspaceCadences: 'workspaceCadences',
  cadence: 'cadence',
  workspaceEntryTriggers: 'workspaceEntryTriggers',
  workspaceLeadJourneys: 'workspaceLeadJourneys',
  directory: 'directory',
  connectorHealth: 'connectorHealth',
  channelHealth: 'channelHealth',
  routingReadiness: 'routingReadiness',
  auditEvents: 'auditEvents',
})
