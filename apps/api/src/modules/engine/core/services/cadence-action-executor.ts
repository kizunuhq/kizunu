import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { Injectable } from '@nestjs/common'

export interface ActionContext {
  connectorId: string
  credentials: unknown
  externalId: string
}

/**
 * Runs a cadence's closed-vocabulary exit-hook actions. CRM actions go through
 * the connector registry's typed bridges; `notify_user` is currently an
 * internal no-op; `webhook_out` is the single escape hatch.
 */
@Injectable()
export class CadenceActionExecutor {
  constructor(private readonly registry: CrmConnectorRegistry) {}

  async execute(actions: CadenceAction[], ctx: ActionContext): Promise<void> {
    for (const action of actions) {
      await this.run(action, ctx)
    }
  }

  private async run(action: CadenceAction, ctx: ActionContext): Promise<void> {
    const { connectorId, credentials, externalId } = ctx
    if (action.type === 'move_stage') {
      await this.registry.moveStage(
        connectorId,
        externalId,
        { stageId: action.stageId, pipelineId: action.pipelineId },
        credentials,
      )
      return
    }
    if (action.type === 'mark_lost') {
      await this.registry.markLost(connectorId, externalId, action.reason, credentials)
      return
    }
    if (action.type === 'log_activity') {
      await this.registry.logActivity(
        connectorId,
        externalId,
        {
          type: action.activityType,
          subject: action.subject,
          note: action.note,
          ownerExternalId: null,
        },
        credentials,
      )
      return
    }
    if (action.type === 'set_field') {
      await this.registry.setField(connectorId, externalId, action.key, action.value, credentials)
      return
    }
    if (action.type === 'webhook_out') {
      await globalThis.fetch(action.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload ?? {}),
      })
    }
  }
}
