import { z } from 'zod'

export const CreateEntryTriggerRequestSchema = z.object({
  connectorAccountId: z.uuid(),
  pipelineId: z.string().max(100).nullable().default(null),
  stageId: z.string().min(1).max(100),
  cadenceId: z.uuid(),
})

export type CreateEntryTriggerRequest = z.infer<typeof CreateEntryTriggerRequestSchema>

export const CreateEntryTriggerResponseSchema = z.object({ id: z.uuid() })

export type CreateEntryTriggerResponse = z.infer<typeof CreateEntryTriggerResponseSchema>

export const ListEntryTriggersResponseSchema = z.object({
  entryTriggers: z.array(
    z.object({
      id: z.uuid(),
      connectorAccountId: z.uuid(),
      pipelineId: z.string().nullable(),
      stageId: z.string(),
      cadenceId: z.uuid(),
    }),
  ),
})

export type ListEntryTriggersResponse = z.infer<typeof ListEntryTriggersResponseSchema>
