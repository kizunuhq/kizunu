import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class InvalidCredentialsException extends ApplicationException {
  constructor() {
    super('identity.invalid-credentials', 'Invalid email or password.', 401)
  }
}

export class EmailAlreadyTakenException extends ApplicationException {
  constructor(email: string) {
    super('identity.email-already-taken', 'This email is already registered.', 409, { email })
  }
}

export class AccountLockedException extends ApplicationException {
  constructor(lockedUntil: Date) {
    super(
      'identity.account-locked',
      'This account is temporarily locked after too many failed attempts.',
      423,
      { lockedUntil: lockedUntil.toISOString() },
    )
  }
}

export class InvalidResetTokenException extends ApplicationException {
  constructor() {
    super('identity.invalid-reset-token', 'This password reset link is invalid or expired.', 422)
  }
}

export class RegistrationDisabledException extends ApplicationException {
  constructor() {
    super(
      'identity.registration-disabled',
      'Public registration is disabled on this instance.',
      422,
    )
  }
}

export class InvalidVerificationTokenException extends ApplicationException {
  constructor() {
    super(
      'identity.invalid-verification-token',
      'This email verification link is invalid or expired.',
      422,
    )
  }
}

export class UnknownOAuthProviderException extends ApplicationException {
  constructor(provider: string) {
    super('identity.unknown-oauth-provider', 'Unknown OAuth provider.', 422, { provider })
  }
}

export class OAuthEmailUnverifiedException extends ApplicationException {
  constructor() {
    super(
      'identity.oauth-email-unverified',
      'Your provider email is not verified, so it cannot be used to sign in.',
      422,
    )
  }
}

export class OAuthStateMismatchException extends ApplicationException {
  constructor() {
    super('identity.oauth-state-mismatch', 'OAuth state did not match. Please try again.', 422)
  }
}

export class SessionNotFoundException extends ApplicationException {
  constructor() {
    super('identity.session-not-found', 'Session not found.', 422)
  }
}

export class SessionExpiredException extends ApplicationException {
  constructor() {
    super('identity.session-expired', 'Session has expired or has been revoked.', 401)
  }
}

export class WorkspaceMembershipRequiredException extends ApplicationException {
  constructor(workspaceId: string) {
    super(
      'identity.workspace-membership-required',
      'You are not an active member of this workspace.',
      403,
      { workspaceId },
    )
  }
}
