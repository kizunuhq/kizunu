import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryCacheService } from '@kizunu/api/modules/_shared/directory/directory-cache.service'
import { DirectoryQueryService } from '@kizunu/api/modules/_shared/directory/directory-query.service'
import {
  ConnectorDirectoryParamsInvalidException,
  ConnectorDirectoryUnsupportedException,
} from '@kizunu/api/modules/_shared/directory/directory.errors'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountNotFoundException } from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { GetConnectorDirectoryUseCase } from '@kizunu/api/modules/crm/core/use-cases/get-connector-directory.use-case'
import type { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { describe, expect, it, vi } from 'vite-plus/test'
import { z } from 'zod'

const ACCOUNT_ROW = {
  id: 'acc-1',
  workspaceId: 'ws-1',
  connectorId: 'pipedrive',
  credentials: { apiToken: 'tok', companyDomain: 'acme', activityType: 'task' },
}

const RESULT: DirectoryResult = {
  items: [{ value: 'u-1', label: 'Ada' }],
  meta: { truncated: false },
}

const STAGE_PARAMS = z.object({ pipelineId: z.string().min(1) }).strict()

function buildConnector(
  directoryImpl?: (input: {
    resource: string
    params?: Record<string, string>
  }) => Promise<DirectoryResult>,
): CRMConnector {
  return {
    manifest: {
      id: 'pipedrive',
      name: 'Pipedrive',
      capabilities: [],
      configSchema: z.unknown(),
      credentialFields: { kind: 'flat', fields: [] },
      directoryResources: [{ name: 'users' }, { name: 'stages', paramsSchema: STAGE_PARAMS }],
    },
    parseWebhook: () => [],
    fetchLead: async () => ({ externalId: '', ownerExternalId: null, name: '', raw: {} }),
    logActivity: async () => ({ externalActivityId: '' }),
    moveStage: async () => undefined,
    markLost: async () => undefined,
    setField: async () => undefined,
    directory: directoryImpl
      ? async (input) => directoryImpl({ resource: input.resource, params: input.params })
      : undefined,
  } as CRMConnector
}

function buildUseCase(input: { account: typeof ACCOUNT_ROW | undefined; connector: CRMConnector }) {
  const accounts = {
    findById: async () => input.account,
  } as unknown as ConnectorAccountRepository
  const registry = new CrmConnectorRegistry([input.connector])
  const directories = new DirectoryQueryService(new DirectoryCacheService())
  return { useCase: new GetConnectorDirectoryUseCase(registry, accounts, directories) }
}

describe('GetConnectorDirectoryUseCase', () => {
  it('throws ConnectorAccountNotFoundException when the account is missing', async () => {
    const { useCase } = buildUseCase({ account: undefined, connector: buildConnector() })

    await expect(
      useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'users' }),
    ).rejects.toBeInstanceOf(ConnectorAccountNotFoundException)
  })

  it('throws ConnectorAccountNotFoundException when the account belongs to a different workspace', async () => {
    const { useCase } = buildUseCase({ account: ACCOUNT_ROW, connector: buildConnector() })

    await expect(
      useCase.execute({ workspaceId: 'ws-other', accountId: 'acc-1', resource: 'users' }),
    ).rejects.toBeInstanceOf(ConnectorAccountNotFoundException)
  })

  it('throws ConnectorDirectoryUnsupportedException for resources outside the manifest', async () => {
    const directory = vi.fn(async () => RESULT)
    const { useCase } = buildUseCase({
      account: ACCOUNT_ROW,
      connector: buildConnector(directory),
    })

    await expect(
      useCase.execute({ workspaceId: 'ws-1', accountId: 'acc-1', resource: 'pipelines' }),
    ).rejects.toBeInstanceOf(ConnectorDirectoryUnsupportedException)
    expect(directory).not.toHaveBeenCalled()
  })

  it('rejects invalid params before calling the plugin', async () => {
    const directory = vi.fn(async () => RESULT)
    const { useCase } = buildUseCase({
      account: ACCOUNT_ROW,
      connector: buildConnector(directory),
    })

    await expect(
      useCase.execute({
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        resource: 'stages',
        params: {},
      }),
    ).rejects.toBeInstanceOf(ConnectorDirectoryParamsInvalidException)
    expect(directory).not.toHaveBeenCalled()
  })

  it('caches results within ttl and serves the second call without calling the plugin', async () => {
    const directory = vi.fn(async () => RESULT)
    const { useCase } = buildUseCase({
      account: ACCOUNT_ROW,
      connector: buildConnector(directory),
    })

    const first = await useCase.execute({
      workspaceId: 'ws-1',
      accountId: 'acc-1',
      resource: 'users',
    })
    const second = await useCase.execute({
      workspaceId: 'ws-1',
      accountId: 'acc-1',
      resource: 'users',
    })

    expect(first).toEqual(RESULT)
    expect(second).toEqual(RESULT)
    expect(directory).toHaveBeenCalledTimes(1)
  })
})
