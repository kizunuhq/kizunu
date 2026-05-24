import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'

import type { CrmActivity } from './crm-activity'
import type { CrmConnectorManifest } from './crm-connector-manifest'
import type { NormalizedEvent } from './normalized-event'
import type { NormalizedLead } from './normalized-lead'
import type { NormalizedOwner } from './normalized-owner'
import type { StageRef } from './stage-ref'

/**
 * The CRM connector port (decision D3). CRMs (Pipedrive, future HubSpot/RD) implement
 * this as in-monorepo modules; cadences consume `NormalizedEvent` and never see a
 * provider. `parseWebhook` is pure and must never throw (a webhook handler always
 * acknowledges). `credentials`/`config` are opaque at the port — each connector
 * narrows them via its `configSchema`.
 *
 * `fetchOwner` is optional. Connectors that can surface a deal owner's identity
 * (id + email) implement it so ResolveOwnerService can auto-map by email match;
 * connectors that don't simply omit the method and ingestion falls back to admin
 * mapping. Mirrors the `ChannelPlugin.onAccountCreated?` optional-port pattern
 * from feature 029.
 */
export interface CRMConnector {
  readonly manifest: CrmConnectorManifest
  parseWebhook(raw: unknown, config: unknown): NormalizedEvent[]
  fetchLead(externalId: string, credentials: unknown): Promise<NormalizedLead>
  fetchOwner?(externalId: string, credentials: unknown): Promise<NormalizedOwner | null>
  logActivity(
    externalId: string,
    activity: CrmActivity,
    credentials: unknown,
  ): Promise<{ externalActivityId: string }>
  moveStage(externalId: string, stage: StageRef, credentials: unknown): Promise<void>
  markLost(externalId: string, reason: string, credentials: unknown): Promise<void>
  setField(externalId: string, field: string, value: unknown, credentials: unknown): Promise<void>
  directory?(input: DirectoryInput): Promise<DirectoryResult>
}
