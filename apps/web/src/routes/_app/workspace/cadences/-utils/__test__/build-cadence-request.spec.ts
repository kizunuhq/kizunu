import type { CadenceStepDraft } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-step-row'
import { buildCadenceRequest } from '@kizunu/web/routes/_app/workspace/cadences/-utils/build-cadence-request'
import { describe, expect, it } from 'vite-plus/test'

function buildStep(overrides: Partial<CadenceStepDraft> = {}): CadenceStepDraft {
  return {
    id: 'step-1',
    channelPluginId: 'meta-whatsapp',
    templateId: 'template-1',
    delayMinutes: 60,
    ...overrides,
  }
}

describe('buildCadenceRequest', () => {
  describe('step mapping', () => {
    it('maps a draft step to a lead-owner template touch', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up L1',
        steps: [buildStep()],
        onReplyStageId: '',
        sendingWindowPreset: 'always_on',
      })

      expect(request.steps).toEqual([
        {
          channelPluginId: 'meta-whatsapp',
          templateId: 'template-1',
          delayMinutes: 60,
          jitterMinutes: 0,
          channelStrategy: 'lead_owner',
        },
      ])
    })

    it('nulls an empty templateId so the step carries no template reference', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep({ templateId: '' })],
        onReplyStageId: '',
        sendingWindowPreset: 'always_on',
      })

      expect(request.steps[0]?.templateId).toBeNull()
    })

    it('preserves the order of multiple steps', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep({ id: 'a', delayMinutes: 10 }), buildStep({ id: 'b', delayMinutes: 20 })],
        onReplyStageId: '',
        sendingWindowPreset: 'always_on',
      })

      expect(request.steps.map((step) => step.delayMinutes)).toEqual([10, 20])
    })
  })

  describe('onReply action', () => {
    it('adds a move_stage action when a reply stage is set', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep()],
        onReplyStageId: 'replied-stage',
        sendingWindowPreset: 'always_on',
      })

      expect(request.onReply).toEqual([{ type: 'move_stage', stageId: 'replied-stage' }])
    })

    it('leaves onReply empty when no reply stage is set', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep()],
        onReplyStageId: '',
        sendingWindowPreset: 'always_on',
      })

      expect(request.onReply).toEqual([])
    })
  })

  it('builds an active, stop-on-reply cadence with empty terminal hooks', () => {
    const request = buildCadenceRequest({
      name: 'Follow-up L1',
      steps: [buildStep()],
      onReplyStageId: '',
      sendingWindowPreset: 'always_on',
    })

    expect(request.name).toBe('Follow-up L1')
    expect(request.status).toBe('active')
    expect(request.stopOnReply).toBe(true)
    expect(request.onExhausted).toEqual([])
    expect(request.onComplete).toEqual([])
  })
})
