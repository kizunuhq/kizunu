import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class UnknownCrmConnectorException extends ApplicationException {
  constructor(connectorId: string) {
    super('crm.connector-unknown', 'No CRM connector is registered for this id.', 404, {
      connectorId,
    })
  }
}

export class DuplicateCrmConnectorException extends ApplicationException {
  constructor(connectorId: string) {
    super('crm.connector-duplicate', 'Two CRM connectors registered with the same id.', 500, {
      connectorId,
    })
  }
}

export class InvalidConnectorCredentialsException extends ApplicationException {
  constructor(connectorId: string) {
    super(
      'crm.invalid-credentials',
      'The credentials do not satisfy this CRM connector schema.',
      422,
      { connectorId },
    )
  }
}

export class ConnectorAccountNotFoundException extends ApplicationException {
  constructor(connectorAccountId: string) {
    super('crm.account-not-found', 'Connector account not found.', 404, { connectorAccountId })
  }
}

export class CrmRequestFailedException extends ApplicationException {
  constructor(detail: string) {
    super('crm.request-failed', 'A CRM provider request failed.', 502, { detail })
  }
}

export class PipedriveTokenInvalidException extends ApplicationException {
  constructor() {
    super(
      'crm.token-invalid',
      'Pipedrive rejected the API token. Double-check that the token is active and belongs to a user with API access.',
      422,
    )
  }
}

export class PipedriveCompanyDomainUnresolvedException extends ApplicationException {
  constructor() {
    super(
      'crm.company-domain-unresolved',
      'Could not derive the Pipedrive company domain from /users/me. Provide it manually under Advanced settings.',
      422,
    )
  }
}

export class ConnectorHealthUnsupportedException extends ApplicationException {
  constructor(connectorId: string) {
    super('crm.health-unsupported', 'This CRM connector does not expose a health check.', 422, {
      connectorId,
    })
  }
}
