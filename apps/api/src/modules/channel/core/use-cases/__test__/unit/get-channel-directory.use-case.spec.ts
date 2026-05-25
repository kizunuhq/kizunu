import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryCacheService } from '@kizunu/api/modules/_shared/directory/directory-cache.service'
import { DirectoryQueryService } from '@kizunu/api/modules/_shared/directory/directory-query.service'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'
import { ChannelAccountNotFoundException } from '@kizunu/api/modules/channel/core/errors/channel.errors'
import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { GetChannelDirectoryUseCase } from '@kizunu/api/modules/channel/core/use-cases/get-channel-directory.use-case'
import type { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { describe, expect, it, vi } from 'vite-plus/test'
import { z } from 'zod'

const ACCOUNT_ROW = {
  workspaceId: 'ws-1',
  pluginId: 'meta-whatsapp',
  credentials: {},
}

const RESULT: DirectoryResult = {
  items: [{ value: 't-1', label: 'welcome' }],
  meta: { truncated: false },
}

function buildPlugin(
  directoryImpl?: (input: { resource: string }) => Promise<DirectoryResult>,
): ChannelPlugin {
  return {
    manifest: {
      id: 'meta-whatsapp',
      name: 'Meta WhatsApp',
      capabilities: [],
      configSchema: z.unknown(),
      credentialFields: { kind: 'flat', fields: [] },
      connect: { kind: 'credentials' as const },
      directoryResources: [{ name: 'templates' }, { name: 'phoneNumbers' }],
    },
    send: async () => ({ externalMessageId: '', status: 'sent' as const }),
    parseInbound: async () => [],
    validate: () => ({ action: 'error', reason: 'unknown' }),
    directory: directoryImpl
      ? async (input) => directoryImpl({ resource: input.resource })
      : undefined,
  } as ChannelPlugin
}

function buildUseCase(input: { account: typeof ACCOUNT_ROW | undefined; plugin: ChannelPlugin }) {
  const accounts = {
    findForDirectory: async () => input.account,
  } as unknown as ChannelAccountRepository
  const registry = new ChannelPluginRegistry([input.plugin])
  const directories = new DirectoryQueryService(new DirectoryCacheService())
  return { useCase: new GetChannelDirectoryUseCase(registry, accounts, directories) }
}

describe('GetChannelDirectoryUseCase', () => {
  it('throws when the channel account is missing', async () => {
    const { useCase } = buildUseCase({ account: undefined, plugin: buildPlugin() })

    await expect(
      useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'templates' }),
    ).rejects.toBeInstanceOf(ChannelAccountNotFoundException)
  })

  it('throws when the account belongs to a different workspace', async () => {
    const { useCase } = buildUseCase({ account: ACCOUNT_ROW, plugin: buildPlugin() })

    await expect(
      useCase.execute({ workspaceId: 'ws-other', accountId: 'acc-1', resource: 'templates' }),
    ).rejects.toBeInstanceOf(ChannelAccountNotFoundException)
  })

  it('throws unsupported for resources outside the manifest', async () => {
    const directory = vi.fn(async () => RESULT)
    const { useCase } = buildUseCase({ account: ACCOUNT_ROW, plugin: buildPlugin(directory) })

    await expect(
      useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'mystery' }),
    ).rejects.toBeInstanceOf(ConnectorDirectoryUnsupportedException)
    expect(directory).not.toHaveBeenCalled()
  })

  it('serves the cached result on subsequent calls', async () => {
    const directory = vi.fn(async () => RESULT)
    const { useCase } = buildUseCase({ account: ACCOUNT_ROW, plugin: buildPlugin(directory) })

    await useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'templates' })
    await useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'templates' })

    expect(directory).toHaveBeenCalledTimes(1)
  })
})
