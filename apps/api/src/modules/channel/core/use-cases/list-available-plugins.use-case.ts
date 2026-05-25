import type { CredentialField } from '@kizunu/api-contracts/shared'
import { Injectable } from '@nestjs/common'

import type { ChannelCapability } from '../plugin/channel-capability'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface AvailablePlugin {
  id: string
  name: string
  capabilities: ChannelCapability[]
  credentialFields: CredentialField[]
}

/**
 * Lists plugin manifests for `GET /channel-plugins`. The wire response is a
 * flat array of operator-input fields per plugin — `defineChannelPlugin`
 * derives `credentialFields` from `inputSchema ?? configSchema` and asserts
 * the result is flat (a discriminated stored schema requires the plugin to
 * declare a non-discriminated `inputSchema` for the create-account path).
 */
@Injectable()
export class ListAvailablePluginsUseCase {
  constructor(private readonly registry: ChannelPluginRegistry) {}

  execute(): AvailablePlugin[] {
    return this.registry.listManifests().map((manifest) => {
      if (manifest.credentialFields.kind !== 'flat') {
        // Boot-time invariant: defineChannelPlugin guarantees inputSchema
        // produces a flat CredentialFields. Reaching here means the manifest
        // was wired through a different path.
        throw new Error(
          `Channel plugin "${manifest.id}" has a discriminated credentialFields shape; declare an inputSchema in its manifest.`,
        )
      }
      return {
        id: manifest.id,
        name: manifest.name,
        capabilities: manifest.capabilities,
        credentialFields: manifest.credentialFields.fields,
      }
    })
  }
}
