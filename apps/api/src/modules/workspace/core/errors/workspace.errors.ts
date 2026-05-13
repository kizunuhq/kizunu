import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class WorkspaceNotFoundException extends ApplicationException {
  constructor(workspaceId: string) {
    super('workspace.not-found', 'Workspace not found.', 404, { workspaceId })
  }
}

export class MembershipNotFoundException extends ApplicationException {
  constructor(membershipId: string) {
    super('workspace.membership-not-found', 'Membership not found.', 404, {
      membershipId,
    })
  }
}

export class NotWorkspaceAdminException extends ApplicationException {
  constructor(workspaceId: string) {
    super(
      'workspace.not-admin',
      'You must be an admin of this workspace to perform this action.',
      403,
      { workspaceId },
    )
  }
}

export class InvitationTokenInvalidException extends ApplicationException {
  constructor() {
    super(
      'workspace.invitation-invalid',
      'Invitation token is invalid, already used, or expired.',
      400,
    )
  }
}

export class InvitationEmailMismatchException extends ApplicationException {
  constructor() {
    super(
      'workspace.invitation-email-mismatch',
      'This invitation was sent to a different email address.',
      403,
    )
  }
}

export class AlreadyMemberException extends ApplicationException {
  constructor(workspaceId: string) {
    super('workspace.already-member', 'You are already a member of this workspace.', 409, {
      workspaceId,
    })
  }
}
