import { Injectable } from '@nestjs/common'

import type { ChannelCapability } from '../plugin/channel-capability'
import type { ChannelCredentialField } from '../plugin/channel-credential-field'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface AvailablePlugin {
  id: string
  name: string
  capabilities: ChannelCapability[]
  credentialFields: ChannelCredentialField[]
}

@Injectable()
export class ListAvailablePluginsUseCase {
  constructor(private readonly registry: ChannelPluginRegistry) {}

  execute(): AvailablePlugin[] {
    return this.registry.listManifests().map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
      capabilities: manifest.capabilities,
      credentialFields: manifest.credentialFields,
    }))
  }
}
