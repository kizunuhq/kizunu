export const OAUTH_ERROR_COPY = {
  oauth_state: {
    title: 'Sign-in interrupted',
    body: 'Your sign-in session expired or was tampered with. Try again.',
  },
  'identity.oauth-email-conflict': {
    title: 'Email already in use',
    body: 'An account with that email exists. Sign in with your password first, then link the provider.',
  },
  'identity.oauth-provider-missing': {
    title: 'Provider unavailable',
    body: 'That sign-in provider is not enabled on this instance.',
  },
  'identity.registration-disabled': {
    title: 'Registration disabled',
    body: 'Public sign-up is turned off. Ask an admin for an invitation.',
  },
} as const

export type OAuthErrorCode = keyof typeof OAUTH_ERROR_COPY

const GENERIC = {
  title: 'Sign-in failed',
  body: 'Try again, or use your email and password.',
} as const

interface OAuthErrorCopy {
  title: string
  body: string
}

export function lookupOAuthErrorCopy(code: string): OAuthErrorCopy {
  return isOAuthErrorCode(code) ? OAUTH_ERROR_COPY[code] : GENERIC
}

function isOAuthErrorCode(code: string): code is OAuthErrorCode {
  return Object.prototype.hasOwnProperty.call(OAUTH_ERROR_COPY, code)
}
