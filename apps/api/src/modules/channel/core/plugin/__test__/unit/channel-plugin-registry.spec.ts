import {
  DuplicateChannelPluginException,
  InvalidChannelCredentialsException,
  UnknownChannelPluginException,
} from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { describe, expect, it, vi } from 'vite-plus/test'

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

  describe('typed bridges', () => {
    it('parses raw credentials once before calling plugin.send', async () => {
      const plugin = new FakeChannelPlugin()
      const spy = vi.spyOn(plugin, 'send')
      const registry = new ChannelPluginRegistry([plugin])

      await registry.send('fake', { to: 'lead-1', mode: 'freeform' }, validCredentials)

      expect(spy).toHaveBeenCalledWith({ to: 'lead-1', mode: 'freeform' }, validCredentials)
    })

    it('rejects send when credentials fail the plugin schema', async () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      await expect(
        registry.send('fake', { to: 'lead-1', mode: 'freeform' }, { apiKey: '' }),
      ).rejects.toThrow(InvalidChannelCredentialsException)
    })

    it('parses raw credentials once before calling plugin.parseInbound', async () => {
      const plugin = new FakeChannelPlugin()
      const spy = vi.spyOn(plugin, 'parseInbound')
      const registry = new ChannelPluginRegistry([plugin])

      await registry.parseInbound('fake', { event: 'msg' }, validCredentials)

      expect(spy).toHaveBeenCalledWith({ event: 'msg' }, validCredentials)
    })

    it('rejects directory when the plugin does not declare the hook', async () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      await expect(
        registry.directory('fake', { accountId: 'acc-1', resource: 'whatever' }, validCredentials),
      ).rejects.toThrow(InvalidChannelCredentialsException)
    })

    it('refreshCredentials returns the parsed input when the plugin omits the hook', async () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      const result = await registry.refreshCredentials('fake', 'acc-1', validCredentials)

      expect(result).toEqual(validCredentials)
    })

    it('refreshCredentials re-parses the plugin return against configSchema', async () => {
      const plugin = new FakeChannelPlugin() as FakeChannelPlugin & {
        refreshCredentials: (input: {
          channelAccountId: string
          credentials: unknown
        }) => Promise<unknown>
      }
      plugin.refreshCredentials = async ({ credentials }) => {
        if (typeof credentials !== 'object' || credentials === null) {
          throw new Error('expected object credentials')
        }
        return { ...credentials, sender: 'kizunu-new' }
      }
      const registry = new ChannelPluginRegistry([plugin])

      const result = await registry.refreshCredentials('fake', 'acc-1', validCredentials)

      expect(result).toEqual({ apiKey: 'key-1', sender: 'kizunu-new' })
    })

    it('refreshCredentials rejects a malformed plugin return', async () => {
      const plugin = new FakeChannelPlugin() as FakeChannelPlugin & {
        refreshCredentials: (input: {
          channelAccountId: string
          credentials: unknown
        }) => Promise<unknown>
      }
      plugin.refreshCredentials = async () => ({ apiKey: '' })
      const registry = new ChannelPluginRegistry([plugin])

      await expect(registry.refreshCredentials('fake', 'acc-1', validCredentials)).rejects.toThrow(
        InvalidChannelCredentialsException,
      )
    })

    it('onAccountCreated returns the validated input when the plugin omits the hook', async () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      const result = await registry.onAccountCreated(
        'fake',
        { channelAccountId: 'acc-1', appUrl: 'https://api.example' },
        validCredentials,
      )

      expect(result).toEqual(validCredentials)
    })

    it('onAccountCreated re-parses the plugin return against configSchema', async () => {
      const plugin = new FakeChannelPlugin() as FakeChannelPlugin & {
        onAccountCreated: (input: {
          channelAccountId: string
          appUrl: string
          credentials: unknown
        }) => Promise<unknown>
      }
      plugin.onAccountCreated = async ({ credentials }) => {
        if (typeof credentials !== 'object' || credentials === null) {
          throw new Error('expected object credentials')
        }
        return { ...credentials, sender: 'stamped-by-hook' }
      }
      const registry = new ChannelPluginRegistry([plugin])

      const result = await registry.onAccountCreated(
        'fake',
        { channelAccountId: 'acc-1', appUrl: 'https://api.example' },
        validCredentials,
      )

      expect(result).toEqual({ apiKey: 'key-1', sender: 'stamped-by-hook' })
    })

    it('onAccountCreated rejects a malformed plugin return', async () => {
      const plugin = new FakeChannelPlugin() as FakeChannelPlugin & {
        onAccountCreated: (input: {
          channelAccountId: string
          appUrl: string
          credentials: unknown
        }) => Promise<unknown>
      }
      plugin.onAccountCreated = async () => ({ apiKey: '' })
      const registry = new ChannelPluginRegistry([plugin])

      await expect(
        registry.onAccountCreated(
          'fake',
          { channelAccountId: 'acc-1', appUrl: 'https://api.example' },
          validCredentials,
        ),
      ).rejects.toThrow(InvalidChannelCredentialsException)
    })

    it('every typed bridge rejects an unknown plugin id', async () => {
      const registry = new ChannelPluginRegistry([new FakeChannelPlugin()])

      await expect(
        registry.send('missing', { to: 'lead-1', mode: 'freeform' }, validCredentials),
      ).rejects.toThrow(UnknownChannelPluginException)
      await expect(registry.parseInbound('missing', {}, validCredentials)).rejects.toThrow(
        UnknownChannelPluginException,
      )
      await expect(
        registry.directory('missing', { accountId: 'a', resource: 'r' }, validCredentials),
      ).rejects.toThrow(UnknownChannelPluginException)
      await expect(
        registry.refreshCredentials('missing', 'acc-1', validCredentials),
      ).rejects.toThrow(UnknownChannelPluginException)
      await expect(
        registry.onAccountCreated(
          'missing',
          { channelAccountId: 'a', appUrl: 'u' },
          validCredentials,
        ),
      ).rejects.toThrow(UnknownChannelPluginException)
    })
  })
})
