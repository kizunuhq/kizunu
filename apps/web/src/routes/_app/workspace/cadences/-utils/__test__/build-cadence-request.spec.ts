import type { CadenceStepDraft } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-step-row'
import {
  type BuildCadenceInput,
  buildCadenceRequest,
} from '@kizunu/web/routes/_app/workspace/cadences/-utils/build-cadence-request'
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

function buildInput(overrides: Partial<BuildCadenceInput> = {}): BuildCadenceInput {
  return {
    name: 'Follow-up',
    steps: [buildStep()],
    onReplyStageId: '',
    onReplyTaskSubject: '',
    onReplyTaskNote: '',
    onExhaustedLostReason: '',
    sendingWindowPreset: 'always_on',
    ...overrides,
  }
}

describe('buildCadenceRequest', () => {
  describe('step mapping', () => {
    it('maps a draft step to a lead-owner template touch', () => {
      const request = buildCadenceRequest(buildInput({ name: 'Follow-up L1' }))

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
      const request = buildCadenceRequest(buildInput({ steps: [buildStep({ templateId: '' })] }))

      expect(request.steps[0]?.templateId).toBeNull()
    })

    it('preserves the order of multiple steps', () => {
      const request = buildCadenceRequest(
        buildInput({
          steps: [
            buildStep({ id: 'a', delayMinutes: 10 }),
            buildStep({ id: 'b', delayMinutes: 20 }),
          ],
        }),
      )

      expect(request.steps.map((step) => step.delayMinutes)).toEqual([10, 20])
    })
  })

  describe('onReply action', () => {
    it('adds a move_stage action when a reply stage is set', () => {
      const request = buildCadenceRequest(buildInput({ onReplyStageId: 'replied-stage' }))

      expect(request.onReply).toEqual([{ type: 'move_stage', stageId: 'replied-stage' }])
    })

    it('leaves onReply empty when neither stage nor task subject is set', () => {
      const request = buildCadenceRequest(buildInput())

      expect(request.onReply).toEqual([])
    })

    it('adds a log_activity task when onReplyTaskSubject is set', () => {
      const request = buildCadenceRequest(
        buildInput({
          onReplyTaskSubject: 'Lead replied',
          onReplyTaskNote: 'BDR follow up',
        }),
      )

      expect(request.onReply).toEqual([
        {
          type: 'log_activity',
          activityType: 'task',
          subject: 'Lead replied',
          note: 'BDR follow up',
        },
      ])
    })

    it('combines move_stage + log_activity when both are set', () => {
      const request = buildCadenceRequest(
        buildInput({
          onReplyStageId: 'replied-stage',
          onReplyTaskSubject: 'Lead replied',
        }),
      )

      expect(request.onReply).toHaveLength(2)
      expect(request.onReply[0]).toEqual({ type: 'move_stage', stageId: 'replied-stage' })
      expect(request.onReply[1]).toMatchObject({
        type: 'log_activity',
        activityType: 'task',
        subject: 'Lead replied',
      })
    })
  })

  describe('onExhausted action', () => {
    it('adds a mark_lost action when a lost reason is set', () => {
      const request = buildCadenceRequest(
        buildInput({ onExhaustedLostReason: 'No reply after follow-up' }),
      )

      expect(request.onExhausted).toEqual([
        { type: 'mark_lost', reason: 'No reply after follow-up' },
      ])
    })

    it('leaves onExhausted empty when no lost reason is set', () => {
      const request = buildCadenceRequest(buildInput())

      expect(request.onExhausted).toEqual([])
    })
  })

  it('builds an active, stop-on-reply cadence with empty terminal hooks by default', () => {
    const request = buildCadenceRequest(buildInput({ name: 'Follow-up L1' }))

    expect(request.name).toBe('Follow-up L1')
    expect(request.status).toBe('active')
    expect(request.stopOnReply).toBe(true)
    expect(request.onExhausted).toEqual([])
    expect(request.onComplete).toEqual([])
  })
})
