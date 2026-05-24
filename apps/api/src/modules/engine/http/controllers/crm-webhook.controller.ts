import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { StartJourneyUseCase } from '../../core/use-cases/start-journey.use-case'

interface CredentialsWithToken {
  webhookToken?: string
}

function readWebhookToken(credentials: unknown): string | undefined {
  if (typeof credentials !== 'object' || credentials === null) return undefined
  const token = (credentials as CredentialsWithToken).webhookToken
  return typeof token === 'string' && token.length > 0 ? token : undefined
}

/**
 * Public CRM webhook, one URL per connector account. The path's account id and the
 * `?token=` query param together authenticate the call: the id resolves the account,
 * the token (generated server-side at create, stored inside the encrypted
 * credentials JSONB) prevents an attacker who learns the account id from forging
 * events. Accounts created before feature 053 carry no `webhookToken` and skip
 * verification (backward-compatible).
 */
@Public()
@ApiTags('webhooks')
@Controller('webhooks/crm')
export class CrmWebhookController {
  constructor(
    private readonly connectors: ConnectorAccountRepository,
    private readonly registry: CrmConnectorRegistry,
    private readonly startJourney: StartJourneyUseCase,
  ) {}

  @Post(':connectorAccountId')
  @HttpCode(200)
  async receive(
    @Param('connectorAccountId') connectorAccountId: string,
    @Query('token') token: string | undefined,
    @Body() rawBody: unknown,
  ): Promise<{ received: number }> {
    const account = await this.connectors.findById(connectorAccountId)
    if (!account) throw new NotFoundException()

    const expected = readWebhookToken(account.credentials)
    if (expected && expected !== token) {
      throw new ForbiddenException()
    }

    const events = this.registry.get(account.connectorId).parseWebhook(rawBody, account.credentials)
    for (const event of events) {
      await this.startJourney.execute({
        workspaceId: account.workspaceId,
        connectorAccountId: account.id,
        connectorId: account.connectorId,
        credentials: account.credentials,
        event,
      })
    }
    return { received: events.length }
  }
}
