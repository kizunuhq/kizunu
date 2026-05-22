import { z } from 'zod'

export const ListChannelAccountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.uuid(),
      pluginId: z.string(),
      name: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
})

export type ListChannelAccountsResponse = z.infer<typeof ListChannelAccountsResponseSchema>
