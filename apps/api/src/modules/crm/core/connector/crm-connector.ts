import type { CrmActivity } from './crm-activity'
import type { CrmConnectorManifest } from './crm-connector-manifest'
import type { NormalizedEvent } from './normalized-event'
import type { NormalizedLead } from './normalized-lead'
import type { StageRef } from './stage-ref'

/**
 * The CRM connector port (decision D3). CRMs (Pipedrive, future HubSpot/RD) implement
 * this as in-monorepo modules; cadences consume `NormalizedEvent` and never see a
 * provider. `parseWebhook` is pure and must never throw (a webhook handler always
 * acknowledges). `credentials`/`config` are opaque at the port — each connector
 * narrows them via its `configSchema`.
 */
export interface CRMConnector {
  readonly manifest: CrmConnectorManifest
  parseWebhook(raw: unknown, config: unknown): NormalizedEvent[]
  fetchLead(externalId: string, credentials: unknown): Promise<NormalizedLead>
  logActivity(
    externalId: string,
    activity: CrmActivity,
    credentials: unknown,
  ): Promise<{ externalActivityId: string }>
  moveStage(externalId: string, stage: StageRef, credentials: unknown): Promise<void>
  markLost(externalId: string, reason: string, credentials: unknown): Promise<void>
  setField(externalId: string, field: string, value: unknown, credentials: unknown): Promise<void>
}
