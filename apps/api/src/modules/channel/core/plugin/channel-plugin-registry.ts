import { Inject, Injectable } from '@nestjs/common'

import {
  DuplicateChannelPluginException,
  InvalidChannelCredentialsException,
  UnknownChannelPluginException,
} from '../errors/channel.errors'
import type { ChannelPlugin } from './channel-plugin'
import type { ChannelPluginManifest } from './channel-plugin-manifest'

/** DI token for the array of channel plugins wired into the module. */
export const CHANNEL_PLUGINS = Symbol('CHANNEL_PLUGINS')

/**
 * Resolves channel plugins by id and validates ChannelAccount credentials against
 * a plugin's `configSchema`. Plugins are injected as a multi-provider array and
 * indexed at construction; a duplicate id is a wiring error and fails fast.
 */
@Injectable()
export class ChannelPluginRegistry {
  private readonly plugins = new Map<string, ChannelPlugin>()

  constructor(@Inject(CHANNEL_PLUGINS) plugins: ChannelPlugin[]) {
    for (const plugin of plugins) {
      if (this.plugins.has(plugin.manifest.id)) {
        throw new DuplicateChannelPluginException(plugin.manifest.id)
      }
      this.plugins.set(plugin.manifest.id, plugin)
    }
  }

  has(id: string): boolean {
    return this.plugins.has(id)
  }

  get(id: string): ChannelPlugin {
    const plugin = this.plugins.get(id)
    if (!plugin) throw new UnknownChannelPluginException(id)
    return plugin
  }

  listManifests(): ChannelPluginManifest[] {
    return [...this.plugins.values()].map((plugin) => plugin.manifest)
  }

  validateCredentials(id: string, credentials: unknown): unknown {
    const plugin = this.get(id)
    const result = plugin.manifest.configSchema.safeParse(credentials)
    if (!result.success) throw new InvalidChannelCredentialsException(id)
    return result.data
  }
}
