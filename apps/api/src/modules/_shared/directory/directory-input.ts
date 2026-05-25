export interface DirectoryInput<T = unknown> {
  accountId: string
  resource: string
  credentials: T
  params?: Readonly<Record<string, string>>
}
