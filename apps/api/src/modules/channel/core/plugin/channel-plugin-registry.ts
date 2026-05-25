import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import { Inject, Injectable } from '@nestjs/common'

import {
  DuplicateChannelPluginException,
  InvalidChannelCredentialsException,
  UnknownChannelPluginException,
} from '../errors/channel.errors'
import type { ChannelPlugin } from './channel-plugin'
import type { ChannelPluginManifest } from './channel-plugin-manifest'
import type { InboundMessage } from './inbound-message'
import type { OnAccountCreatedInput } from './on-account-created-input'
import type { SendPayload } from './send-payload'
import type { SendResult } from './send-result'

/** DI token for the array of channel plugins wired into the module. */
export const CHANNEL_PLUGINS = Symbol('CHANNEL_PLUGINS')

/**
 * Resolves channel plugins by id and parses ChannelAccount credentials at a
 * single seam. Use-cases call the typed-bridge methods (`send`,
 * `parseInbound`, `directory`, `refreshCredentials`, `onAccountCreated`)
 * instead of reaching for `plugin.X` directly; the bridge parses the raw
 * value against the plugin's `configSchema` once and passes the typed
 * credentials to the plugin.
 *
 * `validateCredentials` is preserved for the create-account path — it parses
 * the operator's submission against `inputSchema ?? configSchema` and returns
 * the parsed value the caller passes back to `onAccountCreated`.
 *
 * Plugins are injected as a multi-provider array and indexed at construction;
 * a duplicate id is a wiring error and fails fast.
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

  /**
   * Parses the operator's submission against the plugin's `inputSchema`
   * (falling back to `configSchema` when absent). Used by the create-account
   * use-case before calling `onAccountCreated`.
   */
  validateCredentials(id: string, credentials: unknown): unknown {
    const plugin = this.get(id)
    const schema = plugin.manifest.inputSchema ?? plugin.manifest.configSchema
    const result = schema.safeParse(credentials)
    if (!result.success) throw new InvalidChannelCredentialsException(id)
    return result.data
  }

  async send(id: string, payload: SendPayload, rawCredentials: unknown): Promise<SendResult> {
    const plugin = this.get(id)
    return plugin.send(payload, this.parseStored(plugin, id, rawCredentials))
  }

  async parseInbound(id: string, raw: unknown, rawCredentials: unknown): Promise<InboundMessage[]> {
    const plugin = this.get(id)
    return plugin.parseInbound(raw, this.parseStored(plugin, id, rawCredentials))
  }

  async directory(
    id: string,
    input: Omit<DirectoryInput, 'credentials'>,
    rawCredentials: unknown,
  ): Promise<DirectoryResult> {
    const plugin = this.get(id)
    if (!plugin.directory) {
      throw new InvalidChannelCredentialsException(id)
    }
    return plugin.directory({ ...input, credentials: this.parseStored(plugin, id, rawCredentials) })
  }

  /**
   * Calls the plugin's `refreshCredentials` hook with already-parsed stored
   * credentials. Returns the refreshed value re-parsed against `configSchema`
   * before persistence so a buggy refresh surfaces as 422 instead of writing
   * a malformed row. Plugins without the hook return their input unchanged.
   */
  async refreshCredentials(
    id: string,
    channelAccountId: string,
    rawCredentials: unknown,
  ): Promise<unknown> {
    const plugin = this.get(id)
    if (!plugin.refreshCredentials) return this.parseStored(plugin, id, rawCredentials)
    const parsedInput = this.parseStored(plugin, id, rawCredentials)
    const refreshed = await plugin.refreshCredentials({
      channelAccountId,
      credentials: parsedInput,
    })
    return this.parseStored(plugin, id, refreshed)
  }

  /**
   * Runs the plugin's `onAccountCreated` hook with a pre-validated input
   * value (e.g. the operator's submission or the connect-coex use-case's
   * pre-stamp). The return is re-parsed against `configSchema` so the
   * persisted row is guaranteed to match the stored shape. Plugins without
   * the hook return the input unchanged.
   */
  async onAccountCreated(
    id: string,
    input: Omit<OnAccountCreatedInput, 'credentials'>,
    validatedCredentials: unknown,
  ): Promise<unknown> {
    const plugin = this.get(id)
    if (!plugin.onAccountCreated) return validatedCredentials
    const result = await plugin.onAccountCreated({ ...input, credentials: validatedCredentials })
    return this.parseStored(plugin, id, result)
  }

  private parseStored(plugin: ChannelPlugin, id: string, raw: unknown): unknown {
    const result = plugin.manifest.configSchema.safeParse(raw)
    if (!result.success) throw new InvalidChannelCredentialsException(id)
    return result.data
  }
}
