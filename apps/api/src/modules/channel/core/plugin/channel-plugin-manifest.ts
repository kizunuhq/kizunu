import type { CredentialFields } from '@kizunu/api-contracts/shared'
import type { DirectoryResourceDescriptor } from '@kizunu/api/modules/_shared/directory/directory-resource-descriptor'
import type { ZodType } from 'zod'

import type { ChannelCapability } from './channel-capability'

/**
 * Static description of a channel plugin.
 *
 * `configSchema` is the **stored shape** — the credentials object the plugin
 * persists on the `channelAccounts.credentials jsonb` column. Downstream
 * methods (`send`, `parseInbound`, `directory`, `refreshCredentials`) receive
 * `z.infer<S>` already-parsed via the registry's typed bridges.
 *
 * `inputSchema` is the **operator-input shape** — the subset of credentials
 * the operator submits at create time. Plugins whose stored shape matches
 * the operator input exactly omit it, in which case `I` defaults to `S`.
 * Plugins like Meta whose stored shape carries server-generated fields
 * (e.g. `verifyToken`) or a discriminator the operator does not provide
 * (e.g. `channelMode: 'cloud_api'`) declare it separately; `onAccountCreated`
 * receives `z.infer<I>` and returns `z.infer<S>`.
 *
 * `credentialFields` is the declarative projection of `inputSchema ??
 * configSchema` the web app renders a form from — derived by
 * `describeCredentialFields(...)` when the plugin is built via
 * `defineChannelPlugin(...)`.
 *
 * `directoryResources` enumerates the lookup resources the plugin can serve
 * via `directory(input)`. The directory controller uses it to reject
 * unsupported resources with 422 before any provider call.
 */
export interface ChannelPluginManifest<S extends ZodType = ZodType, I extends ZodType = S> {
  id: string
  name: string
  capabilities: ChannelCapability[]
  configSchema: S
  inputSchema?: I
  credentialFields: CredentialFields
  directoryResources?: readonly DirectoryResourceDescriptor[]
}
