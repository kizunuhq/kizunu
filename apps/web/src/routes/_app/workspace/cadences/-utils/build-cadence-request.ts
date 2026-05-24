import type { CadenceRequest } from '@kizunu/api-contracts/cadence'
import type { CadenceStepDraft } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-step-row'

import { presetToSendingWindow, type SendingWindowPresetKey } from './sending-window-presets'

export function buildCadenceRequest(input: {
  name: string
  steps: CadenceStepDraft[]
  onReplyStageId: string
  sendingWindowPreset: SendingWindowPresetKey
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
    sendingWindow: presetToSendingWindow(input.sendingWindowPreset),
  }
}
