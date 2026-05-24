export interface DirectoryInput {
  resource: string
  credentials: unknown
  params?: Readonly<Record<string, string>>
}
