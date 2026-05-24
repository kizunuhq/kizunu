export interface DirectoryCacheKey {
  workspaceId: string
  accountId: string
  resource: string
  params: Readonly<Record<string, string>>
}
