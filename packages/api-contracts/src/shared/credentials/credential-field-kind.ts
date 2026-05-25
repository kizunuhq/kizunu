export const CredentialFieldKind = {
  Text: 'text',
  Secret: 'secret',
} as const

export type CredentialFieldKind = (typeof CredentialFieldKind)[keyof typeof CredentialFieldKind]
