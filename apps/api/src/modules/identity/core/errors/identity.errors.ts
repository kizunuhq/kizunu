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
