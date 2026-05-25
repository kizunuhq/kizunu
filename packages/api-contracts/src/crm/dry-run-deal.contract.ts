import { z } from 'zod'

export const DryRunDealRequestSchema = z.object({
  externalDealId: z.string().min(1),
})

export type DryRunDealRequest = z.infer<typeof DryRunDealRequestSchema>
