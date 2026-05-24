import type { SendingWindow } from '@kizunu/api/modules/cadence/core/domain/sending-window'
import {
  isWithinWindow,
  slideToWindow,
} from '@kizunu/api/modules/cadence/core/domain/sending-window-slide'
import { describe, expect, it } from 'vite-plus/test'

const businessHoursSP: SendingWindow = {
  timezone: 'America/Sao_Paulo',
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 18 * 60,
}

describe('isWithinWindow', () => {
  it('returns true at 10:00 São Paulo on a Tuesday', () => {
    const tuesdayTenAmInSP = new Date('2026-05-26T13:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, tuesdayTenAmInSP)).toBe(true)
  })

  it('returns false at 03:00 São Paulo on a Tuesday (before window)', () => {
    const tuesdayThreeAmInSP = new Date('2026-05-26T06:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, tuesdayThreeAmInSP)).toBe(false)
  })

  it('returns false at 19:00 São Paulo on a Tuesday (after window)', () => {
    const tuesdayBoundaryAfter = new Date('2026-05-26T22:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, tuesdayBoundaryAfter)).toBe(false)
  })

  it('returns false on Saturday at 10:00 São Paulo (day not allowed)', () => {
    const saturdayTenAm = new Date('2026-05-30T13:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, saturdayTenAm)).toBe(false)
  })

  it('treats endMinute as exclusive', () => {
    const tuesdayExactlySixPm = new Date('2026-05-26T21:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, tuesdayExactlySixPm)).toBe(false)
  })

  it('treats startMinute as inclusive', () => {
    const tuesdayNineAm = new Date('2026-05-26T12:00:00.000Z')

    expect(isWithinWindow(businessHoursSP, tuesdayNineAm)).toBe(true)
  })
})

describe('slideToWindow', () => {
  it('returns the input when already inside the window', () => {
    const tuesdayTenAm = new Date('2026-05-26T13:00:00.000Z')

    const result = slideToWindow(businessHoursSP, tuesdayTenAm)

    expect(result.toISOString()).toBe(tuesdayTenAm.toISOString())
  })

  it('slides forward to today 09:00 when today is allowed but it is before start', () => {
    const tuesdayThreeAm = new Date('2026-05-26T06:00:00.000Z')

    const result = slideToWindow(businessHoursSP, tuesdayThreeAm)

    expect(result.toISOString()).toBe('2026-05-26T12:00:00.000Z')
  })

  it('slides forward to the next weekday at 09:00 when today is past endMinute', () => {
    const tuesdayTenPm = new Date('2026-05-27T01:00:00.000Z')

    const result = slideToWindow(businessHoursSP, tuesdayTenPm)

    expect(result.toISOString()).toBe('2026-05-27T12:00:00.000Z')
  })

  it('slides over a weekend to Monday 09:00 when current day is Saturday', () => {
    const saturdayMidday = new Date('2026-05-30T15:00:00.000Z')

    const result = slideToWindow(businessHoursSP, saturdayMidday)

    expect(result.toISOString()).toBe('2026-06-01T12:00:00.000Z')
  })

  it('lands on the next allowed day when only Sundays are allowed', () => {
    const onlySundaysWindow: SendingWindow = {
      timezone: 'America/Sao_Paulo',
      days: [0],
      startMinute: 10 * 60,
      endMinute: 12 * 60,
    }
    const mondayMorning = new Date('2026-05-25T13:00:00.000Z')

    const result = slideToWindow(onlySundaysWindow, mondayMorning)

    expect(result.toISOString()).toBe('2026-05-31T13:00:00.000Z')
  })
})
