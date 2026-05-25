import {
  describeCredentialFields,
  PluginCredentialsShapeUnsupportedException,
} from '@kizunu/api-contracts/shared'
import type { CredentialFields } from '@kizunu/api-contracts/shared'
import type { ZodType } from 'zod'

import type { ChannelPlugin } from './channel-plugin'
import { ChannelPluginConnectKind } from './channel-plugin-connect'
import type { ChannelPluginConnect } from './channel-plugin-connect'
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
  manifest: Omit<ChannelPluginManifest<S, I>, 'credentialFields' | 'connect'> & {
    connect?: ChannelPluginConnect
  }
}

function resolveCredentialFields(
  spec: ChannelPluginSpec<ZodType>,
  connect: ChannelPluginConnect,
): CredentialFields {
  if (connect.kind === ChannelPluginConnectKind.Oauth) {
    return { kind: 'flat', fields: [] }
  }
  const result = describeCredentialFields(spec.manifest.inputSchema ?? spec.manifest.configSchema)
  if (result.kind !== 'flat') {
    throw new PluginCredentialsShapeUnsupportedException(
      `Plugin "${spec.manifest.id}" has a discriminated operator-facing schema; declare a non-discriminated inputSchema.`,
    )
  }
  return result
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
 *    stays a flat per-plugin field list. OAuth plugins skip this check.
 */
export function defineChannelPlugin<S extends ZodType, I extends ZodType = S>(
  spec: ChannelPluginSpec<S, I>,
): ChannelPlugin<S, I> {
  const connect: ChannelPluginConnect = spec.manifest.connect ?? {
    kind: ChannelPluginConnectKind.Credentials,
  }
  const credentialFields = resolveCredentialFields(spec as ChannelPluginSpec<ZodType>, connect)
  return {
    ...spec,
    manifest: { ...spec.manifest, credentialFields, connect },
  }
}
