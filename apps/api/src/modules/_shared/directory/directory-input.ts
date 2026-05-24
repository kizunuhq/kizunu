export interface DirectoryInput {
  accountId: string
  resource: string
  credentials: unknown
  params?: Readonly<Record<string, string>>
}
