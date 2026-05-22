import { z } from 'zod'

export const ListConnectorAccountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.uuid(),
      connectorId: z.string(),
      name: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
})

export type ListConnectorAccountsResponse = z.infer<typeof ListConnectorAccountsResponseSchema>
