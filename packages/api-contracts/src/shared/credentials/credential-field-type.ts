export const CredentialFieldType = {
  Text: 'text',
  Secret: 'secret',
} as const

export type CredentialFieldType = (typeof CredentialFieldType)[keyof typeof CredentialFieldType]
