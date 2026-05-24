import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { Injectable } from '@nestjs/common'
import type { ZodType } from 'zod'

import { DirectoryCacheService } from './directory-cache.service'
import type { DirectoryInput } from './directory-input'
import type { DirectoryResourceDescriptor } from './directory-resource-descriptor'
import {
  ConnectorDirectoryFailedException,
  ConnectorDirectoryParamsInvalidException,
  ConnectorDirectoryUnsupportedException,
  ConnectorRateLimitedException,
  ConnectorTokenExpiredException,
} from './directory.errors'

const DEFAULT_TTL_MS = 60_000

export interface DirectoryCapable {
  manifest: {
    id: string
    directoryResources?: readonly DirectoryResourceDescriptor[]
  }
  directory?: (input: DirectoryInput) => Promise<DirectoryResult>
}

interface RunDirectoryQueryInput {
  workspaceId: string
  accountId: string
  resource: string
  params: Readonly<Record<string, string>>
  credentials: unknown
  plugin: DirectoryCapable
}

@Injectable()
export class DirectoryQueryService {
  constructor(private readonly cache: DirectoryCacheService) {}

  async run(input: RunDirectoryQueryInput): Promise<DirectoryResult> {
    const descriptor = input.plugin.manifest.directoryResources?.find(
      (entry) => entry.name === input.resource,
    )
    if (!descriptor || !input.plugin.directory) {
      throw new ConnectorDirectoryUnsupportedException({
        connectorId: input.plugin.manifest.id,
        resource: input.resource,
      })
    }
    const params = parseParams(descriptor.paramsSchema, input.resource, input.params)
    const ttlMs = descriptor.ttlMs ?? DEFAULT_TTL_MS
    const directoryFn = input.plugin.directory.bind(input.plugin)
    try {
      return await this.cache.getOrLoad(
        {
          workspaceId: input.workspaceId,
          accountId: input.accountId,
          resource: input.resource,
          params,
        },
        () =>
          directoryFn({
            accountId: input.accountId,
            resource: input.resource,
            credentials: input.credentials,
            params,
          }),
        ttlMs,
      )
    } catch (error) {
      throw mapProviderError(error, input.accountId, input.resource)
    }
  }
}

function parseParams(
  schema: ZodType | undefined,
  resource: string,
  raw: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  if (!schema) return raw
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ConnectorDirectoryParamsInvalidException({
      resource,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  // Cast is safe by construction: the schema's output shape is owned by the
  // plugin manifest, and every supported schema in this codebase produces a
  // string-only record (see pipedrive.connector STAGE_PARAMS_SCHEMA).
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return result.data as Readonly<Record<string, string>>
}

function mapProviderError(error: unknown, accountId: string, resource: string): Error {
  if (
    error instanceof ConnectorTokenExpiredException ||
    error instanceof ConnectorRateLimitedException ||
    error instanceof ConnectorDirectoryFailedException ||
    error instanceof ConnectorDirectoryUnsupportedException ||
    error instanceof ConnectorDirectoryParamsInvalidException
  ) {
    return error
  }
  return new ConnectorDirectoryFailedException({
    accountId,
    resource,
    detail: error instanceof Error ? error.message : 'unknown provider error',
  })
}
