import type { CredentialFieldType } from './credential-field-type'

export interface CredentialField {
  key: string
  label: string
  type: CredentialFieldType
  required: boolean
  serverGenerated?: boolean
}
