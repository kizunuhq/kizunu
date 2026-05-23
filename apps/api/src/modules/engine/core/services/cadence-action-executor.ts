import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { Injectable } from '@nestjs/common'

export interface ActionContext {
  connector: CRMConnector
  credentials: unknown
  externalId: string
}

/**
 * Runs a cadence's closed-vocabulary exit-hook actions. CRM actions go through the
 * connector; `notify_user` is currently an internal no-op; `webhook_out` is the
 * single escape hatch. Flat guard clauses (not a switch) keep each action's type
 * narrowed.
 */
@Injectable()
export class CadenceActionExecutor {
  async execute(actions: CadenceAction[], ctx: ActionContext): Promise<void> {
    for (const action of actions) {
      await this.run(action, ctx)
    }
  }

  private async run(action: CadenceAction, ctx: ActionContext): Promise<void> {
    const { connector, credentials, externalId } = ctx
    if (action.type === 'move_stage') {
      await connector.moveStage(
        externalId,
        { stageId: action.stageId, pipelineId: action.pipelineId },
        credentials,
      )
      return
    }
    if (action.type === 'mark_lost') {
      await connector.markLost(externalId, action.reason, credentials)
      return
    }
    if (action.type === 'log_activity') {
      await connector.logActivity(
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
      await connector.setField(externalId, action.key, action.value, credentials)
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
