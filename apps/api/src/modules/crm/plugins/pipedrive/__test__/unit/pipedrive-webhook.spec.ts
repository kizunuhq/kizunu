import { parsePipedriveWebhook } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive-webhook'
import { describe, expect, it } from 'vite-plus/test'

function stageChangePayload() {
  return {
    event: 'updated.deal',
    meta: { action: 'updated', object: 'deal', id: 99, timestamp: 1700000000 },
    current: { id: 99, stage_id: 5, user_id: 42 },
    previous: { id: 99, stage_id: 3, user_id: 42 },
  }
}

describe('parsePipedriveWebhook', () => {
  it('emits lead.stage_entered when the deal stage changes', () => {
    const events = parsePipedriveWebhook(stageChangePayload())

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'lead.stage_entered',
      externalId: '99',
      ownerExternalId: '42',
      stageId: '5',
      idempotencyKey: 'pipedrive:deal:99:event:updated:1700000000',
    })
  })

  it('emits nothing when the stage is unchanged', () => {
    const payload = stageChangePayload()
    payload.previous.stage_id = 5

    expect(parsePipedriveWebhook(payload)).toEqual([])
  })

  it('emits nothing for a non-deal object', () => {
    const payload = { ...stageChangePayload(), meta: { action: 'updated', object: 'person' } }

    expect(parsePipedriveWebhook(payload)).toEqual([])
  })

  it('returns an empty array for a malformed payload instead of throwing', () => {
    expect(parsePipedriveWebhook({ junk: true })).toEqual([])
    expect(parsePipedriveWebhook('not-json')).toEqual([])
  })

  it('treats a missing owner as null', () => {
    const payload = stageChangePayload()
    payload.current.user_id = undefined as unknown as number

    expect(parsePipedriveWebhook(payload)[0]?.ownerExternalId).toBeNull()
  })
})
