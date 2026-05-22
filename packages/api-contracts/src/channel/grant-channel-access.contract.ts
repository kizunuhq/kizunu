import { z } from 'zod'

export const GrantChannelAccessRequestSchema = z.object({
  userId: z.uuid(),
})

export type GrantChannelAccessRequest = z.infer<typeof GrantChannelAccessRequestSchema>
