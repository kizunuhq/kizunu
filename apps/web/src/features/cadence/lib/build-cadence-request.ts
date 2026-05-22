import type { CadenceRequest } from '@kizunu/api-contracts/cadence'
import type { CadenceStepDraft } from '@kizunu/web/features/cadence/components/cadence-step-row'

/** Maps the cadence builder's draft state to the typed create/update request. */
export function buildCadenceRequest(input: {
  name: string
  steps: CadenceStepDraft[]
  onReplyStageId: string
}): CadenceRequest {
  return {
    name: input.name,
    status: 'active',
    stopOnReply: true,
    steps: input.steps.map((step) => ({
      channelPluginId: step.channelPluginId,
      templateId: step.templateId || null,
      delayMinutes: step.delayMinutes,
      jitterMinutes: 0,
      channelStrategy: 'lead_owner',
    })),
    onReply: input.onReplyStageId ? [{ type: 'move_stage', stageId: input.onReplyStageId }] : [],
    onExhausted: [],
    onComplete: [],
  }
}
