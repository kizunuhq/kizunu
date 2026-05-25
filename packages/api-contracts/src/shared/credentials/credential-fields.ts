import type { CredentialField } from './credential-field'

export type CredentialFields =
  | { kind: 'flat'; fields: CredentialField[] }
  | { kind: 'discriminated'; key: string; variants: Record<string, CredentialField[]> }
