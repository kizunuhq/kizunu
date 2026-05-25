import { pipedriveCredentialsInputSchema } from '@kizunu/api-contracts/crm'
import { z, type ZodType } from 'zod'

/**
 * Per-connector client-side credentials schema, mirroring the channel
 * module's plugin-client-schemas map. Uses the connector's create-time
 * input schema (e.g. `pipedriveCredentialsInputSchema`) so the form
 * accepts the same shape the server-side `prepareCredentials` hook
 * consumes — companyDomain optional, webhookToken absent.
 */
const CONNECTOR_CLIENT_SCHEMAS: Readonly<Record<string, ZodType>> = {
  pipedrive: pipedriveCredentialsInputSchema,
}

const OPEN_FALLBACK = z.record(z.string(), z.unknown())

export function getConnectorCredentialsSchema(connectorId: string): ZodType {
  return CONNECTOR_CLIENT_SCHEMAS[connectorId] ?? OPEN_FALLBACK
}
