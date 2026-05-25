import { PluginCredentialsShapeUnsupportedException } from '@kizunu/api-contracts/shared'
import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import { ChannelCapability } from '../../channel-capability'
import type { ChannelDecision } from '../../channel-decision'
import { ChannelPluginConnectKind, OauthProvider } from '../../channel-plugin-connect'
import { defineChannelPlugin } from '../../define-channel-plugin'
import type { ChannelPluginSpec } from '../../define-channel-plugin'

const simpleSchema = z.object({ apiKey: z.string().min(1) })

function baseSpec(): ChannelPluginSpec<typeof simpleSchema> {
  return {
    manifest: {
      id: 'test-plugin',
      name: 'Test',
      capabilities: [ChannelCapability.Freeform],
      configSchema: simpleSchema,
    },
    send: async () => ({ externalMessageId: 'x', status: 'sent' }),
    parseInbound: async () => [],
    validate: (): ChannelDecision => ({ action: 'send', mode: 'freeform' }),
  }
}

describe('defineChannelPlugin', () => {
  describe('default-credentials', () => {
    it('defaults connect to credentials kind when omitted', () => {
      const plugin = defineChannelPlugin(baseSpec())

      expect(plugin.manifest.connect).toEqual({ kind: ChannelPluginConnectKind.Credentials })
    })
  })

  describe('explicit-credentials', () => {
    it('preserves explicit credentials connect and runs flatness check', () => {
      const spec = baseSpec()
      spec.manifest.connect = { kind: ChannelPluginConnectKind.Credentials }

      const plugin = defineChannelPlugin(spec)

      expect(plugin.manifest.connect).toEqual({ kind: ChannelPluginConnectKind.Credentials })
      expect(plugin.manifest.credentialFields.kind).toBe('flat')
    })

    it('throws when credentials plugin has a discriminated configSchema and no inputSchema', () => {
      const discriminated = z.discriminatedUnion('mode', [
        z.object({ mode: z.literal('a'), token: z.string() }),
        z.object({ mode: z.literal('b'), secret: z.string() }),
      ])
      const spec = {
        ...baseSpec(),
        manifest: { ...baseSpec().manifest, configSchema: discriminated },
      }

      expect(() => defineChannelPlugin(spec as never)).toThrow(
        PluginCredentialsShapeUnsupportedException,
      )
    })
  })

  describe('explicit-oauth', () => {
    it('preserves oauth connect and returns empty credentialFields', () => {
      const spec = baseSpec()
      spec.manifest.connect = {
        kind: ChannelPluginConnectKind.Oauth,
        provider: OauthProvider.MetaCoex,
      }

      const plugin = defineChannelPlugin(spec)

      expect(plugin.manifest.connect).toEqual({
        kind: ChannelPluginConnectKind.Oauth,
        provider: OauthProvider.MetaCoex,
      })
      expect(plugin.manifest.credentialFields).toEqual({ kind: 'flat', fields: [] })
    })

    it('does not throw for an oauth plugin with a discriminated configSchema', () => {
      const discriminated = z.discriminatedUnion('channelMode', [
        z.object({ channelMode: z.literal('coexistence'), token: z.string() }),
      ])
      const spec = {
        ...baseSpec(),
        manifest: {
          ...baseSpec().manifest,
          configSchema: discriminated,
          connect: { kind: ChannelPluginConnectKind.Oauth, provider: OauthProvider.MetaCoex },
        },
      }

      expect(() => defineChannelPlugin(spec as never)).not.toThrow()
    })
  })
})
