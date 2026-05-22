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
