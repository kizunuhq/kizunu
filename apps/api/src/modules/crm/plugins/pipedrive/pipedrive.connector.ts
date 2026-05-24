import type { CrmActivity } from '../../core/connector/crm-activity'
import type { CRMConnector } from '../../core/connector/crm-connector'
import type { CrmConnectorManifest } from '../../core/connector/crm-connector-manifest'
import type { NormalizedEvent } from '../../core/connector/normalized-event'
import type { NormalizedLead } from '../../core/connector/normalized-lead'
import type { NormalizedOwner } from '../../core/connector/normalized-owner'
import type { StageRef } from '../../core/connector/stage-ref'
import { type FetchFn, PipedriveApi } from './pipedrive-api'
import { pipedriveCredentialsSchema } from './pipedrive-credentials'
import { parsePipedriveWebhook } from './pipedrive-webhook'

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
  }

  private readonly api: PipedriveApi

  constructor(options?: { baseUrl?: string; fetchFn?: FetchFn }) {
    this.api = new PipedriveApi(options?.fetchFn ?? globalThis.fetch, options?.baseUrl)
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
}
