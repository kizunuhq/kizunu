import type { CadenceAction, CadenceRequest } from '@kizunu/api-contracts/cadence'
import type { CadenceStepDraft } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-step-row'

import { presetToSendingWindow, type SendingWindowPresetKey } from './sending-window-presets'

export interface BuildCadenceInput {
  name: string
  steps: CadenceStepDraft[]
  onReplyStageId: string
  onReplyTaskSubject: string
  onReplyTaskNote: string
  onExhaustedLostReason: string
  sendingWindowPreset: SendingWindowPresetKey
}

export function buildCadenceRequest(input: BuildCadenceInput): CadenceRequest {
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
    onReply: buildOnReply(input),
    onExhausted: buildOnExhausted(input),
    onComplete: [],
    sendingWindow: presetToSendingWindow(input.sendingWindowPreset),
  }
}

function buildOnReply(input: BuildCadenceInput): CadenceAction[] {
  const actions: CadenceAction[] = []
  if (input.onReplyStageId) {
    actions.push({ type: 'move_stage', stageId: input.onReplyStageId })
  }
  const subject = input.onReplyTaskSubject.trim()
  if (subject.length > 0) {
    const note = input.onReplyTaskNote.trim()
    actions.push({
      type: 'log_activity',
      activityType: 'task',
      subject,
      ...(note.length > 0 ? { note } : {}),
    })
  }
  return actions
}

function buildOnExhausted(input: BuildCadenceInput): CadenceAction[] {
  const reason = input.onExhaustedLostReason.trim()
  if (reason.length === 0) return []
  return [{ type: 'mark_lost', reason }]
}
