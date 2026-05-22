/**
 * Stable TanStack Query cache keys. One namespace per resource; hooks compose
 * these with parameters (`[QueryKeys.members, workspaceId]`) so invalidation
 * stays predictable across the client.
 */
export const QueryKeys = Object.freeze({
  currentUser: 'currentUser',
  members: 'members',
  workspaceChannels: 'workspaceChannels',
  myChannels: 'myChannels',
  channelPlugins: 'channelPlugins',
  workspaceConnectors: 'workspaceConnectors',
  workspaceTemplates: 'workspaceTemplates',
})
