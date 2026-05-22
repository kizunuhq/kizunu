export const VerificationTokenType = {
  EmailVerification: 'email_verification',
  PasswordReset: 'password_reset',
  Invitation: 'invitation',
} as const

export type VerificationTokenType =
  (typeof VerificationTokenType)[keyof typeof VerificationTokenType]
