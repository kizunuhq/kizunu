import { z } from 'zod'

export const ConnectMetaCoexRequestSchema = z.object({
  code: z.string().min(1),
  businessId: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  name: z.string().min(1).max(120),
})

export type ConnectMetaCoexRequest = z.infer<typeof ConnectMetaCoexRequestSchema>

export const ConnectMetaCoexResponseSchema = z.object({
  id: z.uuid(),
  pluginId: z.literal('meta-whatsapp-coex'),
  channelMode: z.literal('coexistence'),
  name: z.string(),
})

export type ConnectMetaCoexResponse = z.infer<typeof ConnectMetaCoexResponseSchema>
