import {
  describeCredentialFields,
  PluginCredentialsShapeUnsupportedException,
} from '@kizunu/api-contracts/shared'
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
 * Boot-time invariants — both throw
 * {@link PluginCredentialsShapeUnsupportedException} so Nest fails to start
 * instead of returning malformed responses at runtime:
 *
 * 1. The schema must be a `ZodObject` or `ZodDiscriminatedUnion` (the walker
 *    enforces this).
 * 2. The operator-facing schema (`inputSchema ?? configSchema`) must produce
 *    a flat `CredentialFields`. Plugins with a discriminated stored shape
 *    must declare a non-discriminated `inputSchema` so the wire response
 *    stays a flat per-plugin field list.
 */
export function defineChannelPlugin<S extends ZodType, I extends ZodType = S>(
  spec: ChannelPluginSpec<S, I>,
): ChannelPlugin<S, I> {
  const credentialFields = describeCredentialFields(
    spec.manifest.inputSchema ?? spec.manifest.configSchema,
  )
  if (credentialFields.kind !== 'flat') {
    throw new PluginCredentialsShapeUnsupportedException(
      `Plugin "${spec.manifest.id}" has a discriminated operator-facing schema; declare a non-discriminated inputSchema.`,
    )
  }
  return {
    ...spec,
    manifest: { ...spec.manifest, credentialFields },
  }
}
