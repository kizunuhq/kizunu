import {
  pipedriveCredentialsInputSchema,
  pipedriveCredentialsSchema,
} from '@kizunu/api-contracts/crm'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'
import { z } from 'zod'

import type { CRMConnector } from '../../core/connector/crm-connector'
import { defineCrmConnector } from '../../core/connector/define-crm-connector'
import { type FetchFn, PipedriveApi } from './pipedrive-api'
import {
  listPipedriveDealFields,
  listPipedrivePipelines,
  listPipedriveStages,
  listPipedriveUsers,
} from './pipedrive-directory'
import { preparePipedriveCredentials } from './pipedrive-prepare'
import { parsePipedriveWebhook } from './pipedrive-webhook'

const STAGE_PARAMS_SCHEMA = z.object({ pipelineId: z.string().min(1) }).strict()

export interface PipedriveConnectorOptions {
  baseUrl?: string
  fetchFn?: FetchFn
}

/**
 * Pipedrive CRM connector (decision D3). `parseWebhook` normalizes stage
 * transitions; outbound actions delegate to a thin Graph-style API client.
 * Built via `defineCrmConnector(...)` so every credential-touching method
 * receives already-parsed `PipedriveCredentials` from the registry seam —
 * no per-method `pipedriveCredentialsSchema.parse(...)` calls.
 * `baseUrl`/`fetchFn` are injectable for tests.
 */
export function buildPipedriveConnector(
  options?: PipedriveConnectorOptions,
): CRMConnector<typeof pipedriveCredentialsSchema, typeof pipedriveCredentialsInputSchema> {
  const fetchFn = options?.fetchFn ?? globalThis.fetch
  const baseUrlOverride = options?.baseUrl
  const api = new PipedriveApi(fetchFn, baseUrlOverride)

  return defineCrmConnector<
    typeof pipedriveCredentialsSchema,
    typeof pipedriveCredentialsInputSchema
  >({
    manifest: {
      id: 'pipedrive',
      name: 'Pipedrive',
      capabilities: ['activities', 'stages', 'lost', 'fields'],
      configSchema: pipedriveCredentialsSchema,
      inputSchema: pipedriveCredentialsInputSchema,
      directoryResources: [
        { name: 'users' },
        { name: 'pipelines' },
        { name: 'stages', paramsSchema: STAGE_PARAMS_SCHEMA },
        { name: 'fields' },
      ],
    },
    parseWebhook(raw) {
      return parsePipedriveWebhook(raw)
    },
    async fetchLead(externalId, credentials) {
      return api.fetchLead(externalId, credentials)
    },
    async fetchOwner(externalId, credentials) {
      return api.fetchOwner(externalId, credentials)
    },
    async logActivity(externalId, activity, credentials) {
      return api.logActivity(externalId, activity, credentials)
    },
    async moveStage(externalId, stage, credentials) {
      await api.moveStage(externalId, stage, credentials)
    },
    async markLost(externalId, reason, credentials) {
      await api.markLost(externalId, reason, credentials)
    },
    async setField(externalId, field, value, credentials) {
      await api.setField(externalId, field, value, credentials)
    },
    async prepareCredentials({ credentials }) {
      return preparePipedriveCredentials({ fetchFn, baseUrlOverride }, credentials)
    },
    async directory(input) {
      const ctx = {
        fetchFn,
        baseUrlOverride,
        accountId: input.accountId,
        credentials: input.credentials,
      }
      if (input.resource === 'users') return listPipedriveUsers(ctx)
      if (input.resource === 'pipelines') return listPipedrivePipelines(ctx)
      if (input.resource === 'stages') {
        const params = STAGE_PARAMS_SCHEMA.parse(input.params ?? {})
        return listPipedriveStages(ctx, params.pipelineId)
      }
      if (input.resource === 'fields') return listPipedriveDealFields(ctx)
      throw new ConnectorDirectoryUnsupportedException({
        connectorId: 'pipedrive',
        resource: input.resource,
      })
    },
  })
}
