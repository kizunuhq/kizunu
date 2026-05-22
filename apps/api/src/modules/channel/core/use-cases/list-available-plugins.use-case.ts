import { Injectable } from '@nestjs/common'

import type { ChannelCapability } from '../plugin/channel-capability'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface AvailablePlugin {
  id: string
  name: string
  capabilities: ChannelCapability[]
}

@Injectable()
export class ListAvailablePluginsUseCase {
  constructor(private readonly registry: ChannelPluginRegistry) {}

  execute(): AvailablePlugin[] {
    return this.registry.listManifests().map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
      capabilities: manifest.capabilities,
    }))
  }
}
