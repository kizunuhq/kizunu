import { channelsSearchSchema } from '@kizunu/web/routes/_app/settings/channels/-hooks/use-channels-search'
import { describe, expect, it } from 'vite-plus/test'

describe('channelsSearchSchema', () => {
  it('parses addCoex=1 from a numeric value', () => {
    const result = channelsSearchSchema.parse({ addCoex: 1 })

    expect(result).toEqual({ addCoex: 1 })
  })

  it('parses addCoex=1 from a string value via coerce', () => {
    const result = channelsSearchSchema.parse({ addCoex: '1' })

    expect(result).toEqual({ addCoex: 1 })
  })

  it('returns empty object when addCoex is absent', () => {
    const result = channelsSearchSchema.parse({})

    expect(result).toEqual({})
  })

  it('strips addCoex when set to undefined', () => {
    const result = channelsSearchSchema.parse({ addCoex: undefined })

    expect(result).toEqual({})
  })
})
