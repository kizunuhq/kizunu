import { z } from 'zod'

export const RoutingReadinessMemberSchema = z.object({
  membershipId: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  email: z.email(),
  status: z.string(),
  hasWhatsappAccess: z.boolean(),
  hasPrimaryWhatsappChannel: z.boolean(),
  mappedConnectorAccountIds: z.array(z.uuid()),
})

export type RoutingReadinessMember = z.infer<typeof RoutingReadinessMemberSchema>

export const RoutingReadinessResponseSchema = z.object({
  members: z.array(RoutingReadinessMemberSchema),
})

export type RoutingReadinessResponse = z.infer<typeof RoutingReadinessResponseSchema>
