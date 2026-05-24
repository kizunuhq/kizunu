import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'
import { z } from 'zod'

import type { CrmActivity } from '../../core/connector/crm-activity'
import type { CRMConnector } from '../../core/connector/crm-connector'
import type { CrmConnectorManifest } from '../../core/connector/crm-connector-manifest'
import type { NormalizedEvent } from '../../core/connector/normalized-event'
import type { NormalizedLead } from '../../core/connector/normalized-lead'
import type { NormalizedOwner } from '../../core/connector/normalized-owner'
import type { StageRef } from '../../core/connector/stage-ref'
import { type FetchFn, PipedriveApi } from './pipedrive-api'
import { pipedriveCredentialsSchema } from './pipedrive-credentials'
import { PipedriveDirectory } from './pipedrive-directory'
import { parsePipedriveWebhook } from './pipedrive-webhook'

const STAGE_PARAMS_SCHEMA = z.object({ pipelineId: z.string().min(1) }).strict()

/**
 * Pipedrive CRM connector (decision D3). `parseWebhook` normalizes stage transitions;
 * outbound actions delegate to a thin Graph-style API client. Pipedrive specifics
 * (api token, company domain, activity type) stay behind the port's `configSchema`.
 * `baseUrl`/`fetchFn` are injectable for tests.
 */
export class PipedriveConnector implements CRMConnector {
  readonly manifest: CrmConnectorManifest = {
    id: 'pipedrive',
    name: 'Pipedrive',
    capabilities: ['activities', 'stages', 'lost', 'fields'],
    configSchema: pipedriveCredentialsSchema,
    directoryResources: [
      { name: 'users' },
      { name: 'pipelines' },
      { name: 'stages', paramsSchema: STAGE_PARAMS_SCHEMA },
      { name: 'fields' },
    ],
  }

  private readonly api: PipedriveApi
  private readonly fetchFn: FetchFn
  private readonly baseUrlOverride: string | undefined

  constructor(options?: { baseUrl?: string; fetchFn?: FetchFn }) {
    this.fetchFn = options?.fetchFn ?? globalThis.fetch
    this.baseUrlOverride = options?.baseUrl
    this.api = new PipedriveApi(this.fetchFn, this.baseUrlOverride)
  }

  parseWebhook(raw: unknown): NormalizedEvent[] {
    return parsePipedriveWebhook(raw)
  }

  async fetchLead(externalId: string, credentials: unknown): Promise<NormalizedLead> {
    return await this.api.fetchLead(externalId, pipedriveCredentialsSchema.parse(credentials))
  }

  async fetchOwner(externalId: string, credentials: unknown): Promise<NormalizedOwner | null> {
    return await this.api.fetchOwner(externalId, pipedriveCredentialsSchema.parse(credentials))
  }

  async logActivity(
    externalId: string,
    activity: CrmActivity,
    credentials: unknown,
  ): Promise<{ externalActivityId: string }> {
    return await this.api.logActivity(
      externalId,
      activity,
      pipedriveCredentialsSchema.parse(credentials),
    )
  }

  async moveStage(externalId: string, stage: StageRef, credentials: unknown): Promise<void> {
    await this.api.moveStage(externalId, stage, pipedriveCredentialsSchema.parse(credentials))
  }

  async markLost(externalId: string, reason: string, credentials: unknown): Promise<void> {
    await this.api.markLost(externalId, reason, pipedriveCredentialsSchema.parse(credentials))
  }

  async setField(
    externalId: string,
    field: string,
    value: unknown,
    credentials: unknown,
  ): Promise<void> {
    await this.api.setField(externalId, field, value, pipedriveCredentialsSchema.parse(credentials))
  }

  async directory(input: DirectoryInput): Promise<DirectoryResult> {
    const credentials = pipedriveCredentialsSchema.parse(input.credentials)
    const directory = new PipedriveDirectory({
      fetchFn: this.fetchFn,
      baseUrlOverride: this.baseUrlOverride,
      accountId: input.accountId,
    })
    if (input.resource === 'users') return await directory.listUsers(credentials)
    if (input.resource === 'pipelines') return await directory.listPipelines(credentials)
    if (input.resource === 'stages') {
      const params = STAGE_PARAMS_SCHEMA.parse(input.params ?? {})
      return await directory.listStages(credentials, params.pipelineId)
    }
    if (input.resource === 'fields') return await directory.listDealFields(credentials)
    throw new ConnectorDirectoryUnsupportedException({
      connectorId: this.manifest.id,
      resource: input.resource,
    })
  }
}
