import { z } from 'zod'

export const ReassignLeadsRequestSchema = z.object({
  fromUserId: z.uuid(),
  toUserId: z.uuid(),
})

export type ReassignLeadsRequest = z.infer<typeof ReassignLeadsRequestSchema>
