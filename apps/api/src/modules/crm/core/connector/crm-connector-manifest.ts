import type { ZodType } from 'zod'

/**
 * Static description of a CRM connector. `configSchema` validates the credentials
 * stored on a ConnectorAccount, so provider-specific fields (Pipedrive's api token,
 * company domain) stay inside the connector.
 */
export interface CrmConnectorManifest {
  id: string
  name: string
  capabilities: string[]
  configSchema: ZodType
}
