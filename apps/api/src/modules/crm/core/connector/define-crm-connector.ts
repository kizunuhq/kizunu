import {
  describeCredentialFields,
  PluginCredentialsShapeUnsupportedException,
} from '@kizunu/api-contracts/shared'
import type { ZodType } from 'zod'

import type { CRMConnector } from './crm-connector'
import type { CrmConnectorManifest } from './crm-connector-manifest'

/**
 * Spec a connector author writes — same shape as `CRMConnector<S>`, minus
 * the derived `credentialFields` on the manifest.
 */
export interface CrmConnectorSpec<S extends ZodType> extends Omit<CRMConnector<S>, 'manifest'> {
  manifest: Omit<CrmConnectorManifest<S>, 'credentialFields'>
}

/**
 * Build a `CRMConnector<S>` from a spec by deriving the manifest's
 * `credentialFields` from `configSchema`. Captures `S` via inference so
 * connector methods receive their typed credentials without the implementor
 * declaring the generic explicitly.
 *
 * Throws {@link PluginCredentialsShapeUnsupportedException} at boot when the
 * schema is not a `ZodObject` (connectors don't use discriminated unions
 * today; flat schemas only).
 */
export function defineCrmConnector<S extends ZodType>(spec: CrmConnectorSpec<S>): CRMConnector<S> {
  const credentialFields = describeCredentialFields(spec.manifest.configSchema)
  if (credentialFields.kind !== 'flat') {
    throw new PluginCredentialsShapeUnsupportedException(
      `Connector "${spec.manifest.id}" has a discriminated configSchema; CRM connectors require a flat schema.`,
    )
  }
  return {
    ...spec,
    manifest: { ...spec.manifest, credentialFields },
  }
}
