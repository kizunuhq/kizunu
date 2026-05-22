import type { CadenceStepDraft } from '@kizunu/web/features/cadence/components/cadence-step-row'
import { buildCadenceRequest } from '@kizunu/web/features/cadence/lib/build-cadence-request'
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
      })

      expect(request.steps[0]?.templateId).toBeNull()
    })

    it('preserves the order of multiple steps', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep({ id: 'a', delayMinutes: 10 }), buildStep({ id: 'b', delayMinutes: 20 })],
        onReplyStageId: '',
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
      })

      expect(request.onReply).toEqual([{ type: 'move_stage', stageId: 'replied-stage' }])
    })

    it('leaves onReply empty when no reply stage is set', () => {
      const request = buildCadenceRequest({
        name: 'Follow-up',
        steps: [buildStep()],
        onReplyStageId: '',
      })

      expect(request.onReply).toEqual([])
    })
  })

  it('builds an active, stop-on-reply cadence with empty terminal hooks', () => {
    const request = buildCadenceRequest({
      name: 'Follow-up L1',
      steps: [buildStep()],
      onReplyStageId: '',
    })

    expect(request.name).toBe('Follow-up L1')
    expect(request.status).toBe('active')
    expect(request.stopOnReply).toBe(true)
    expect(request.onExhausted).toEqual([])
    expect(request.onComplete).toEqual([])
  })
})
