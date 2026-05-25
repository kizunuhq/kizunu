import type { CredentialFields } from '@kizunu/api-contracts/shared'
import type { DirectoryResourceDescriptor } from '@kizunu/api/modules/_shared/directory/directory-resource-descriptor'
import type { ZodType } from 'zod'

import type { ChannelCapability } from './channel-capability'

/**
 * Static description of a channel plugin.
 *
 * `configSchema` is the **stored shape** — the full credentials object the
 * plugin persists on the `channelAccounts.credentials jsonb` column and that
 * downstream methods (`send`, `parseInbound`, `directory`,
 * `refreshCredentials`) receive already-parsed via the registry's typed
 * bridges.
 *
 * `inputSchema` (optional) is the **operator-input shape** — the subset the
 * operator submits when creating a channel account, used by the
 * `CreateChannelAccountUseCase`'s registry seam. Plugins whose stored shape
 * matches the operator input exactly omit it (the registry falls back to
 * `configSchema`). Plugins like Meta whose stored shape carries
 * server-generated fields (e.g. `verifyToken`) or a discriminator the
 * operator does not provide (e.g. `channelMode: 'cloud_api'`) declare
 * `inputSchema` separately.
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
export interface ChannelPluginManifest<S extends ZodType = ZodType> {
  id: string
  name: string
  capabilities: ChannelCapability[]
  configSchema: S
  inputSchema?: ZodType
  credentialFields: CredentialFields
  directoryResources?: readonly DirectoryResourceDescriptor[]
}
