import type { Config } from '@kizunu/api/api.config'
import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import type { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { CreateChannelAccountUseCase } from '@kizunu/api/modules/channel/core/use-cases/create-channel-account.use-case'
import type { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import type { ConfigService } from '@kizunu/config-module/config.service'
import { describe, expect, it } from 'vite-plus/test'

const APP_URL = 'https://api.example'

function buildUseCase(plugin: Partial<ChannelPlugin>) {
  const createCalls: Array<{ id?: string; credentials: unknown }> = []
  const accounts = {
    create: async (input: { id?: string; credentials: unknown }) => {
      createCalls.push({ id: input.id, credentials: input.credentials })
      return { id: input.id ?? 'generated' }
    },
  } as unknown as ChannelAccountRepository

  const registry = {
    validateCredentials: (_pluginId: string, value: unknown) => value,
    get: (_pluginId: string) => plugin as ChannelPlugin,
    onAccountCreated: async (
      _pluginId: string,
      hookInput: { channelAccountId: string; appUrl: string },
      validatedCredentials: unknown,
    ) => {
      if (!plugin.onAccountCreated) return validatedCredentials
      return await plugin.onAccountCreated({ ...hookInput, credentials: validatedCredentials })
    },
  } as unknown as ChannelPluginRegistry

  const config = {
    get: (key: string) => (key === 'appUrl' ? APP_URL : undefined),
  } as unknown as ConfigService<Config>

  return { createCalls, useCase: new CreateChannelAccountUseCase(registry, accounts, config) }
}

const input = {
  workspaceId: 'ws-1',
  pluginId: 'meta-whatsapp',
  name: 'Primary',
  credentials: { foo: 'bar' },
}

describe('CreateChannelAccountUseCase', () => {
  it('persists the original credentials when the plugin defines no hook', async () => {
    const { useCase, createCalls } = buildUseCase({})

    const result = await useCase.execute(input)

    expect(result).toMatchObject({ pluginId: 'meta-whatsapp', name: 'Primary' })
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0]?.credentials).toEqual({ foo: 'bar' })
    expect(typeof createCalls[0]?.id).toBe('string')
    expect(createCalls[0]?.id).toHaveLength(36)
  })

  it('invokes onAccountCreated with the pre-minted id and appUrl, persisting the returned credentials', async () => {
    const hookCalls: Array<{ channelAccountId: string; appUrl: string; credentials: unknown }> = []
    const { useCase, createCalls } = buildUseCase({
      onAccountCreated: async (hookInput) => {
        hookCalls.push(hookInput)
        return { ...(hookInput.credentials as object), verifyToken: 'generated' }
      },
    })

    await useCase.execute(input)

    expect(hookCalls).toHaveLength(1)
    expect(hookCalls[0]?.appUrl).toBe(APP_URL)
    expect(hookCalls[0]?.channelAccountId).toBe(createCalls[0]?.id)
    expect(createCalls[0]?.credentials).toEqual({ foo: 'bar', verifyToken: 'generated' })
  })

  it('does not persist the row when the hook throws', async () => {
    const { useCase, createCalls } = buildUseCase({
      onAccountCreated: async () => {
        throw new Error('meta said no')
      },
    })

    await expect(useCase.execute(input)).rejects.toThrow('meta said no')
    expect(createCalls).toHaveLength(0)
  })
})
