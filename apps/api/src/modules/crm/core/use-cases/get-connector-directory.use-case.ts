import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryCacheService } from '@kizunu/api/modules/_shared/directory/directory-cache.service'
import {
  ConnectorDirectoryFailedException,
  ConnectorDirectoryParamsInvalidException,
  ConnectorDirectoryUnsupportedException,
  ConnectorRateLimitedException,
  ConnectorTokenExpiredException,
} from '@kizunu/api/modules/_shared/directory/directory.errors'
import { Injectable } from '@nestjs/common'
import { ZodError } from 'zod'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'

const DEFAULT_TTL_MS = 60_000

export interface GetConnectorDirectoryInput {
  workspaceId: string
  accountId: string
  resource: string
  params?: Readonly<Record<string, string>>
}

@Injectable()
export class GetConnectorDirectoryUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly accounts: ConnectorAccountRepository,
    private readonly cache: DirectoryCacheService,
  ) {}

  async execute(input: GetConnectorDirectoryInput): Promise<DirectoryResult> {
    const account = await this.accounts.findById(input.accountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ConnectorAccountNotFoundException(input.accountId)
    }
    const connector = this.registry.get(account.connectorId)
    const descriptor = connector.manifest.directoryResources?.find(
      (entry) => entry.name === input.resource,
    )
    if (!descriptor || !connector.directory) {
      throw new ConnectorDirectoryUnsupportedException({
        connectorId: account.connectorId,
        resource: input.resource,
      })
    }
    const params = this.validateParams(descriptor.paramsSchema, input.resource, input.params ?? {})
    const ttlMs = descriptor.ttlMs ?? DEFAULT_TTL_MS
    const directoryFn = connector.directory.bind(connector)
    return await this.cache.getOrLoad(
      {
        workspaceId: input.workspaceId,
        accountId: input.accountId,
        resource: input.resource,
        params,
      },
      async () => {
        try {
          return await directoryFn({
            accountId: input.accountId,
            resource: input.resource,
            credentials: account.credentials,
            params,
          })
        } catch (error) {
          this.rethrowProviderError(error, input.accountId, input.resource)
        }
      },
      ttlMs,
    )
  }

  private validateParams(
    schema:
      | { safeParse: (raw: unknown) => { success: boolean; data?: unknown; error?: ZodError } }
      | undefined,
    resource: string,
    raw: Readonly<Record<string, string>>,
  ): Readonly<Record<string, string>> {
    if (!schema) return raw
    const result = schema.safeParse(raw)
    if (!result.success || !result.data) {
      throw new ConnectorDirectoryParamsInvalidException({
        resource,
        issues: collectIssues(result.error),
      })
    }
    return result.data as Readonly<Record<string, string>>
  }

  private rethrowProviderError(error: unknown, accountId: string, resource: string): never {
    if (
      error instanceof ConnectorTokenExpiredException ||
      error instanceof ConnectorRateLimitedException ||
      error instanceof ConnectorDirectoryFailedException ||
      error instanceof ConnectorDirectoryUnsupportedException ||
      error instanceof ConnectorDirectoryParamsInvalidException
    ) {
      throw error
    }
    throw new ConnectorDirectoryFailedException({
      accountId,
      resource,
      detail: error instanceof Error ? error.message : 'unknown provider error',
    })
  }
}

function collectIssues(error: ZodError | undefined): readonly { path: string; message: string }[] {
  if (!error) return []
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}
