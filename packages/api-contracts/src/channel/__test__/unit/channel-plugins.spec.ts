import { describe, expect, it } from 'vite-plus/test'

import {
  ChannelPluginConnectSchema,
  ChannelPluginsResponseSchema,
} from '../../channel-plugins.contract'

describe('ChannelPluginConnectSchema', () => {
  it('parses a credentials-kind entry', () => {
    const result = ChannelPluginConnectSchema.safeParse({ kind: 'credentials' })

    expect(result.success).toBe(true)
  })

  it('parses an oauth-kind entry with a known provider', () => {
    const result = ChannelPluginConnectSchema.safeParse({ kind: 'oauth', provider: 'meta-coex' })

    expect(result.success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    const result = ChannelPluginConnectSchema.safeParse({ kind: 'unknown' })

    expect(result.success).toBe(false)
  })
})

describe('ChannelPluginsResponseSchema', () => {
  it('parses a response with credentials and oauth plugins', () => {
    const response = {
      plugins: [
        {
          id: 'meta-whatsapp',
          name: 'WhatsApp',
          capabilities: ['freeform'],
          credentialFields: [],
          connect: { kind: 'credentials' },
        },
        {
          id: 'meta-whatsapp-coex',
          name: 'WhatsApp (Coex)',
          capabilities: ['freeform', 'template'],
          credentialFields: [],
          connect: { kind: 'oauth', provider: 'meta-coex' },
        },
      ],
    }

    const result = ChannelPluginsResponseSchema.safeParse(response)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.plugins).toHaveLength(2)
      expect(result.data.plugins[0]?.connect.kind).toBe('credentials')
      expect(result.data.plugins[1]?.connect.kind).toBe('oauth')
    }
  })
})
