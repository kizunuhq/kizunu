export interface AuthenticatedUser {
  id: string
  email: string
  activeWorkspaceId: string | null
}

export interface ActiveSession {
  id: string
  userId: string
  activeWorkspaceId: string | null
  expiresAt: Date
}
