import type { CredentialFields } from '@kizunu/api-contracts/shared'
import type { DirectoryResourceDescriptor } from '@kizunu/api/modules/_shared/directory/directory-resource-descriptor'
import type { ZodType } from 'zod'

/**
 * Static description of a CRM connector. `configSchema` is the credentials
 * shape persisted on a ConnectorAccount. Downstream methods (`fetchLead`,
 * `fetchOwner`, `logActivity`, `moveStage`, `markLost`, `setField`,
 * `directory`) receive `z.infer<S>` via the registry's typed bridges.
 *
 * `credentialFields` is derived from `configSchema` by
 * `describeCredentialFields(...)` when the connector is built via
 * `defineCrmConnector(...)`.
 *
 * `directoryResources` enumerates the lookup resources the connector can
 * serve via `directory(input)`. The directory controller uses it to reject
 * unsupported resources with 422 before any provider call.
 */
export interface CrmConnectorManifest<S extends ZodType = ZodType> {
  id: string
  name: string
  capabilities: string[]
  configSchema: S
  credentialFields: CredentialFields
  directoryResources?: readonly DirectoryResourceDescriptor[]
}
