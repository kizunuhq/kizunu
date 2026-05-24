import type { DirectoryResourceDescriptor } from '@kizunu/api/modules/_shared/directory/directory-resource-descriptor'
import type { ZodType } from 'zod'

/**
 * Static description of a CRM connector. `configSchema` validates the credentials
 * stored on a ConnectorAccount, so provider-specific fields (Pipedrive's api token,
 * company domain) stay inside the connector.
 *
 * `directoryResources` enumerates the lookup resources the connector can serve
 * via `directory(input)`. The directory controller uses it to reject unsupported
 * resources with 422 before any provider call.
 */
export interface CrmConnectorManifest {
  id: string
  name: string
  capabilities: string[]
  configSchema: ZodType
  directoryResources?: readonly DirectoryResourceDescriptor[]
}
