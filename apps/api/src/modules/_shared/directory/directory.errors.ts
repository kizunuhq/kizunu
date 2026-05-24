import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class ConnectorDirectoryUnsupportedException extends ApplicationException {
  constructor(input: { connectorId: string; resource: string }) {
    super(
      'connector.directory-unsupported',
      'The connector does not support this directory resource.',
      422,
      input,
    )
  }
}

export class ConnectorDirectoryParamsInvalidException extends ApplicationException {
  constructor(input: { resource: string; issues: readonly { path: string; message: string }[] }) {
    super(
      'connector.directory-params-invalid',
      'Directory parameters did not satisfy the resource schema.',
      422,
      input,
    )
  }
}

export class ConnectorTokenExpiredException extends ApplicationException {
  constructor(input: { accountId: string; scope: 'crm' | 'channel' }) {
    super(
      'connector.token-expired',
      'The connector account credentials are expired — reconnect it to continue.',
      422,
      input,
    )
  }
}

export class ConnectorRateLimitedException extends ApplicationException {
  constructor(input: { accountId: string; retryAfterSeconds?: number }) {
    super(
      'connector.rate-limited',
      'The provider is rate-limiting requests; try again shortly.',
      503,
      input,
    )
  }
}

export class ConnectorDirectoryFailedException extends ApplicationException {
  constructor(input: { accountId: string; resource: string; detail?: string }) {
    super(
      'connector.directory-failed',
      'The provider failed to deliver the directory listing.',
      502,
      input,
    )
  }
}
