import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import { Body, Controller, HttpCode, NotFoundException, Param, Post } from '@nestjs/common'

import { StartJourneyUseCase } from '../../core/use-cases/start-journey.use-case'

/**
 * Public CRM webhook, one URL per connector account (the unguessable account id is the
 * shared secret for v0.1). Resolves the account, parses the payload via its connector,
 * and starts a journey per normalized event. Always acknowledges 200 so the CRM does
 * not retry a delivery we accepted.
 */
@Public()
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
    @Body() rawBody: unknown,
  ): Promise<{ received: number }> {
    const account = await this.connectors.findById(connectorAccountId)
    if (!account) throw new NotFoundException()

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
