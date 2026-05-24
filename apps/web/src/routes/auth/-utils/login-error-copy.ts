import type { ApiError } from '@kizunu/api-client/client/api-error'

export interface LoginErrorCopy {
  message: string
  actionHref?: string
  actionLabel?: string
}

export const LOGIN_ERROR_COPY = {
  'identity.invalid-credentials': {
    message: "Email or password didn't match. Try again or reset your password.",
    actionHref: '/auth/forgot-password',
    actionLabel: 'Reset password',
  },
  'identity.account-locked': {
    message: 'Too many attempts. Try again in a few minutes.',
  },
  'identity.email-taken': {
    message: 'That email is already registered. Sign in instead.',
    actionHref: '/auth/login',
    actionLabel: 'Sign in',
  },
  'identity.registration-disabled': {
    message: 'Public sign-up is turned off on this instance.',
  },
  'identity.invalid-reset-token': {
    message: 'This reset link is invalid or expired. Request a new one.',
    actionHref: '/auth/forgot-password',
    actionLabel: 'Request a new link',
  },
} as const

export type LoginErrorCode = keyof typeof LOGIN_ERROR_COPY

export function mapLoginError(error: ApiError | null | undefined): LoginErrorCopy | null {
  if (!error) return null
  if (isLoginErrorCode(error.code)) return LOGIN_ERROR_COPY[error.code]
  return { message: error.message }
}

function isLoginErrorCode(code: string): code is LoginErrorCode {
  return Object.prototype.hasOwnProperty.call(LOGIN_ERROR_COPY, code)
}
