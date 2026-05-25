import { describeCredentialFields } from '@kizunu/api-contracts/shared'
import type { ZodType } from 'zod'

import type { ChannelPlugin } from './channel-plugin'
import type { ChannelPluginManifest } from './channel-plugin-manifest'

/**
 * Spec a plugin author writes — same shape as `ChannelPlugin<S, I>`, minus
 * the derived `credentialFields` on the manifest. The factory fills that in
 * by walking `inputSchema ?? configSchema`.
 */
export interface ChannelPluginSpec<S extends ZodType, I extends ZodType = S> extends Omit<
  ChannelPlugin<S, I>,
  'manifest'
> {
  manifest: Omit<ChannelPluginManifest<S, I>, 'credentialFields'>
}

/**
 * Build a `ChannelPlugin<S, I>` from a spec by deriving the manifest's
 * `credentialFields` from `inputSchema ?? configSchema`. The factory captures
 * `S` and `I` via inference, so plugin methods (`send`, `parseInbound`,
 * `onAccountCreated`, …) receive their typed credentials without the
 * implementor declaring the generics explicitly.
 *
 * Throws `PluginCredentialsShapeUnsupportedException` at boot when the schema
 * is neither a `ZodObject` nor a `ZodDiscriminatedUnion`.
 */
export function defineChannelPlugin<S extends ZodType, I extends ZodType = S>(
  spec: ChannelPluginSpec<S, I>,
): ChannelPlugin<S, I> {
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
