import { pipedriveCredentialsSchema } from '@kizunu/api-contracts/crm'
import { z, type ZodType } from 'zod'

/**
 * Per-connector client-side credentials schema, mirroring the channel
 * module's plugin-client-schemas map.
 */
const CONNECTOR_CLIENT_SCHEMAS: Readonly<Record<string, ZodType>> = {
  pipedrive: pipedriveCredentialsSchema,
}

const OPEN_FALLBACK = z.record(z.string(), z.unknown())

export function getConnectorCredentialsSchema(connectorId: string): ZodType {
  return CONNECTOR_CLIENT_SCHEMAS[connectorId] ?? OPEN_FALLBACK
}
