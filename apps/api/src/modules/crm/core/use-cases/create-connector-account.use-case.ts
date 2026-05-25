import { randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'

const WEBHOOK_TOKEN_BYTES = 32

export interface CreateConnectorAccountInput {
  workspaceId: string
  connectorId: string
  name: string
  credentials: unknown
}

export interface CreateConnectorAccountOutput {
  id: string
  connectorId: string
  name: string
}

@Injectable()
export class CreateConnectorAccountUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly accounts: ConnectorAccountRepository,
  ) {}

  async execute(input: CreateConnectorAccountInput): Promise<CreateConnectorAccountOutput> {
    const sanitized = stripClientWebhookToken(input.credentials)
    const prepared = await this.registry.prepareCredentials(input.connectorId, sanitized)
    const enriched = withServerWebhookToken(prepared)
    const { id } = await this.accounts.create({
      workspaceId: input.workspaceId,
      connectorId: input.connectorId,
      name: input.name,
      credentials: enriched,
    })
    return { id, connectorId: input.connectorId, name: input.name }
  }
}

function isCredentialsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stripClientWebhookToken(credentials: unknown): unknown {
  if (!isCredentialsObject(credentials)) return credentials
  const { webhookToken: _stripped, ...rest } = credentials
  return rest
}

function withServerWebhookToken(credentials: unknown): unknown {
  if (!isCredentialsObject(credentials)) return credentials
  return { ...credentials, webhookToken: randomWebhookToken() }
}

function randomWebhookToken(): string {
  return randomBytes(WEBHOOK_TOKEN_BYTES).toString('hex')
}
