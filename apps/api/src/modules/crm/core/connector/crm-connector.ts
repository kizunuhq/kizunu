import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import type { ZodType, z } from 'zod'

import type { CrmActivity } from './crm-activity'
import type { CrmConnectorManifest } from './crm-connector-manifest'
import type { NormalizedEvent } from './normalized-event'
import type { NormalizedLead } from './normalized-lead'
import type { NormalizedOwner } from './normalized-owner'
import type { StageRef } from './stage-ref'

/**
 * The CRM connector port (decision D3). CRMs (Pipedrive, future HubSpot/RD)
 * implement this as in-monorepo modules; cadences consume `NormalizedEvent`
 * and never see a provider. `parseWebhook` is pure and must never throw (a
 * webhook handler always acknowledges).
 *
 * `S` is the connector's credentials schema. Every credentials-touching
 * method receives `z.infer<S>` — already parsed by the registry seam against
 * `manifest.configSchema`. Connector implementations don't re-parse.
 *
 * `fetchOwner` is optional. Connectors that can surface a deal owner's
 * identity (id + email) implement it so ResolveOwnerService can auto-map by
 * email match; connectors that don't simply omit the method and ingestion
 * falls back to admin mapping.
 */
export interface CRMConnector<S extends ZodType = ZodType> {
  readonly manifest: CrmConnectorManifest<S>
  parseWebhook(raw: unknown, config: z.infer<S>): NormalizedEvent[]
  fetchLead(externalId: string, credentials: z.infer<S>): Promise<NormalizedLead>
  fetchOwner?(externalId: string, credentials: z.infer<S>): Promise<NormalizedOwner | null>
  logActivity(
    externalId: string,
    activity: CrmActivity,
    credentials: z.infer<S>,
  ): Promise<{ externalActivityId: string }>
  moveStage(externalId: string, stage: StageRef, credentials: z.infer<S>): Promise<void>
  markLost(externalId: string, reason: string, credentials: z.infer<S>): Promise<void>
  setField(
    externalId: string,
    field: string,
    value: unknown,
    credentials: z.infer<S>,
  ): Promise<void>
  directory?(input: DirectoryInput<z.infer<S>>): Promise<DirectoryResult>
}
