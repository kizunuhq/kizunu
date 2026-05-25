import type { CredentialField, CredentialFields } from '@kizunu/api-contracts/shared'
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
 * flat array of operator-input fields per plugin. For plugins whose stored
 * shape is a discriminated union (Meta), the manifest's
 * `describeCredentialFields(...)` output is discriminated; we flatten by
 * picking the variant that matches the plugin's `inputSchema` literal — but
 * since the inputSchema for cloud_api operators omits the discriminator and
 * the walker is fed `inputSchema` first in `defineChannelPlugin`, the
 * resulting `credentialFields` is already flat. The branch below covers the
 * defensive case where a plugin omits `inputSchema`.
 */
@Injectable()
export class ListAvailablePluginsUseCase {
  constructor(private readonly registry: ChannelPluginRegistry) {}

  execute(): AvailablePlugin[] {
    return this.registry.listManifests().map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
      capabilities: manifest.capabilities,
      credentialFields: flatten(manifest.credentialFields),
    }))
  }
}

function flatten(fields: CredentialFields): CredentialField[] {
  if (fields.kind === 'flat') return fields.fields
  const variantKeys = Object.keys(fields.variants)
  // Defensive flatten: when a plugin omits `inputSchema` so the walker walks a
  // discriminated stored schema instead, pick the first variant. This branch
  // is only reached if the manifest is misconfigured upstream; Meta always
  // declares inputSchema. Returning an empty array would silently break the
  // form, so we prefer the first variant.
  const first = variantKeys[0]
  return first ? (fields.variants[first] ?? []) : []
}
