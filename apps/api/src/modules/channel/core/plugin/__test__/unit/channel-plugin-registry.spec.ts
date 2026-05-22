import {
  DuplicateChannelPluginException,
  InvalidChannelCredentialsException,
  UnknownChannelPluginException,
} from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { describe, expect, it } from 'vite-plus/test'

import { FakeChannelPlugin } from '../fake-channel-plugin'

const validCredentials = { apiKey: 'key-1', sender: 'kizunu' }

describe('ChannelPluginRegistry', () => {
  describe('resolution', () => {
    it('resolves a registered plugin by its manifest id', () => {
      const plugin = new FakeChannelPlugin()
      const registry = new ChannelPluginRegistry([plugin])

      expect(registry.get('fake')).toBe(plugin)
      expect(registry.has('fake')).toBe(true)
    })

    it('rejects an unknown plugin id instead of returning undefined', () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      expect(() => registry.get('missing')).toThrow(UnknownChannelPluginException)
      expect(registry.has('missing')).toBe(false)
    })

    it('fails fast when two plugins register the same id', () => {
      expect(
        () => new ChannelPluginRegistry([new FakeChannelPlugin(), new FakeChannelPlugin()]),
      ).toThrow(DuplicateChannelPluginException)
    })

    it('lists the manifest of every registered plugin', () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      const manifests = registry.listManifests()

      expect(manifests).toHaveLength(1)
      expect(manifests[0]?.id).toBe('fake')
      expect(manifests[0]?.capabilities).toEqual(['freeform', 'template'])
    })
  })

  describe('credential validation', () => {
    it('returns the parsed credentials when they satisfy the plugin schema', () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      expect(registry.validateCredentials('fake', validCredentials)).toEqual(validCredentials)
    })

    it('rejects credentials that violate the plugin schema', () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      expect(() => registry.validateCredentials('fake', { apiKey: '' })).toThrow(
        InvalidChannelCredentialsException,
      )
    })

    it('rejects credentials for an unknown plugin id', () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      expect(() => registry.validateCredentials('missing', validCredentials)).toThrow(
        UnknownChannelPluginException,
      )
    })
  })
})
