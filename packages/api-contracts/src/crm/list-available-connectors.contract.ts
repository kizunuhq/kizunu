import { z } from 'zod'

import { CredentialFieldType } from '../shared/credentials/credential-field-type'

export const ConnectorCredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum([CredentialFieldType.Text, CredentialFieldType.Secret]),
  required: z.boolean(),
  serverGenerated: z.boolean().optional(),
})

export const ListAvailableConnectorsResponseSchema = z.object({
  connectors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      capabilities: z.array(z.string()),
      credentialFields: z.array(ConnectorCredentialFieldSchema),
    }),
  ),
})

export type ConnectorCredentialField = z.infer<typeof ConnectorCredentialFieldSchema>
export type ListAvailableConnectorsResponse = z.infer<typeof ListAvailableConnectorsResponseSchema>
