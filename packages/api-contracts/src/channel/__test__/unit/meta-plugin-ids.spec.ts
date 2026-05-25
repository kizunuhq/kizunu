import { describe, expect, it } from 'vite-plus/test'

import { isMetaPluginId } from '../../meta-plugin-ids'

describe('isMetaPluginId', () => {
  it('returns true for both Meta plugin ids', () => {
    expect(isMetaPluginId('meta-whatsapp')).toBe(true)
    expect(isMetaPluginId('meta-whatsapp-coex')).toBe(true)
  })

  it('returns false for non-Meta plugin ids', () => {
    expect(isMetaPluginId('pipedrive')).toBe(false)
    expect(isMetaPluginId('telegram')).toBe(false)
  })
})
