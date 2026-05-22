import { z } from 'zod'

export const CreateConnectorAccountRequestSchema = z.object({
  connectorId: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  credentials: z.record(z.string(), z.unknown()),
})

export type CreateConnectorAccountRequest = z.infer<typeof CreateConnectorAccountRequestSchema>

export const CreateConnectorAccountResponseSchema = z.object({
  id: z.uuid(),
  connectorId: z.string(),
  name: z.string(),
})

export type CreateConnectorAccountResponse = z.infer<typeof CreateConnectorAccountResponseSchema>
