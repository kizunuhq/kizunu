import {
  describeCredentialFields,
  PluginCredentialsShapeUnsupportedException,
} from '@kizunu/api-contracts/shared'
import type { ZodType } from 'zod'

import type { CRMConnector } from './crm-connector'
import type { CrmConnectorManifest } from './crm-connector-manifest'

/**
 * Spec a connector author writes — same shape as `CRMConnector<S, I>`, minus
 * the derived `credentialFields` on the manifest.
 */
export interface CrmConnectorSpec<S extends ZodType, I extends ZodType = S> extends Omit<
  CRMConnector<S, I>,
  'manifest'
> {
  manifest: Omit<CrmConnectorManifest<S, I>, 'credentialFields'>
}

/**
 * Build a `CRMConnector<S, I>` from a spec by deriving the manifest's
 * `credentialFields` from `inputSchema ?? configSchema`. Captures the
 * schemas via inference so connector methods receive their typed credentials
 * without the implementor declaring the generic explicitly.
 *
 * Throws {@link PluginCredentialsShapeUnsupportedException} at boot when the
 * (input or storage) schema is not a `ZodObject` (CRM connectors don't use
 * discriminated unions today; flat schemas only).
 */
export function defineCrmConnector<S extends ZodType, I extends ZodType = S>(
  spec: CrmConnectorSpec<S, I>,
): CRMConnector<S, I> {
  const sourceSchema = spec.manifest.inputSchema ?? spec.manifest.configSchema
  const credentialFields = describeCredentialFields(sourceSchema)
  if (credentialFields.kind !== 'flat') {
    throw new PluginCredentialsShapeUnsupportedException(
      `Connector "${spec.manifest.id}" has a discriminated credentials schema; CRM connectors require a flat schema.`,
    )
  }
  return {
    ...spec,
    manifest: { ...spec.manifest, credentialFields },
  }
}
