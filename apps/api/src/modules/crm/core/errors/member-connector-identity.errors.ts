import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class MemberConnectorIdentityConflictException extends ApplicationException {
  constructor(detail: { connectorAccountId: string; externalId: string }) {
    super(
      'owner.mapping-conflict',
      'Another mapping already exists for this connector account and external id.',
      422,
      detail,
    )
  }
}

export class MemberConnectorIdentityNotFoundException extends ApplicationException {
  constructor(id: string) {
    super('owner.mapping-not-found', 'Member-connector identity not found.', 404, { id })
  }
}

export class MembershipNotInWorkspaceException extends ApplicationException {
  constructor(membershipId: string) {
    super(
      'owner.membership-not-in-workspace',
      'The membership does not belong to this workspace.',
      422,
      { membershipId },
    )
  }
}
