import { describeCredentialFields } from '@kizunu/api-contracts/shared'
import type { ZodType } from 'zod'

import type { ChannelPlugin } from './channel-plugin'
import type { ChannelPluginManifest } from './channel-plugin-manifest'

/**
 * Spec a plugin author writes — same shape as `ChannelPlugin<S>`, minus the
 * derived `credentialFields` on the manifest. The factory fills that in by
 * walking `inputSchema ?? configSchema`.
 */
export interface ChannelPluginSpec<S extends ZodType> extends Omit<ChannelPlugin<S>, 'manifest'> {
  manifest: Omit<ChannelPluginManifest<S>, 'credentialFields'>
}

/**
 * Build a `ChannelPlugin<S>` from a spec by deriving the manifest's
 * `credentialFields` from `inputSchema ?? configSchema`. The factory captures
 * `S` via inference, so plugin methods (`send`, `parseInbound`, …) receive
 * `z.infer<S>` parameters and TypeScript checks every assignment without the
 * implementor declaring the generic explicitly.
 *
 * Throws `PluginCredentialsShapeUnsupportedException` at boot when the schema
 * is neither a `ZodObject` nor a `ZodDiscriminatedUnion`.
 */
export function defineChannelPlugin<S extends ZodType>(
  spec: ChannelPluginSpec<S>,
): ChannelPlugin<S> {
  return {
    ...spec,
    manifest: {
      ...spec.manifest,
      credentialFields: describeCredentialFields(
        spec.manifest.inputSchema ?? spec.manifest.configSchema,
      ),
    },
  }
}
