import { presetToSendingWindow } from '@kizunu/web/routes/_app/workspace/cadences/-utils/sending-window-presets'
import { describe, expect, it } from 'vite-plus/test'

describe('presetToSendingWindow', () => {
  it('returns null for the always-on preset', () => {
    expect(presetToSendingWindow('always_on')).toBeNull()
  })

  it('returns Mon-Fri 9am-6pm São Paulo for the business-hours preset', () => {
    expect(presetToSendingWindow('business_hours')).toEqual({
      timezone: 'America/Sao_Paulo',
      days: [1, 2, 3, 4, 5],
      startMinute: 540,
      endMinute: 1080,
    })
  })

  it('returns Mon-Fri 8am-8pm São Paulo for the weekdays-extended preset', () => {
    expect(presetToSendingWindow('weekdays_extended')).toEqual({
      timezone: 'America/Sao_Paulo',
      days: [1, 2, 3, 4, 5],
      startMinute: 480,
      endMinute: 1200,
    })
  })
})
