import type { CredentialFields } from '@kizunu/api-contracts/shared'
import type { DirectoryResourceDescriptor } from '@kizunu/api/modules/_shared/directory/directory-resource-descriptor'
import type { ZodType } from 'zod'

/**
 * Static description of a CRM connector.
 *
 * `configSchema` is the **stored shape** — the credentials object persisted on
 * a `ConnectorAccount`. Downstream methods (`fetchLead`, `fetchOwner`,
 * `logActivity`, `moveStage`, `markLost`, `setField`, `directory`) receive
 * `z.infer<S>` already-parsed via the registry's typed bridges.
 *
 * `inputSchema` is the **operator-input shape** — the subset of credentials
 * the operator submits at create time. Connectors whose stored shape matches
 * the operator input exactly omit it, in which case `I` defaults to `S`.
 * Connectors like Pipedrive whose stored shape carries server-derived fields
 * (e.g. `companyDomain` resolved from `/users/me`) or server-generated fields
 * (e.g. `webhookToken`) declare it separately; `prepareCredentials` receives
 * `z.infer<I>` and returns `z.infer<S>`.
 *
 * `credentialFields` is derived from `inputSchema ?? configSchema` by
 * `describeCredentialFields(...)` when the connector is built via
 * `defineCrmConnector(...)`.
 *
 * `directoryResources` enumerates the lookup resources the connector can
 * serve via `directory(input)`. The directory controller uses it to reject
 * unsupported resources with 422 before any provider call.
 */
export interface CrmConnectorManifest<S extends ZodType = ZodType, I extends ZodType = S> {
  id: string
  name: string
  capabilities: string[]
  configSchema: S
  inputSchema?: I
  credentialFields: CredentialFields
  directoryResources?: readonly DirectoryResourceDescriptor[]
}
