import type { CredentialFieldKind } from './credential-field-kind'

export interface CredentialField {
  key: string
  label: string
  kind: CredentialFieldKind
  required: boolean
  serverGenerated?: boolean
}
