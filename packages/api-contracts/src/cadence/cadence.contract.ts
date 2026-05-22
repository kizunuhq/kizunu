import { z } from 'zod'

/** Closed-vocabulary exit-hook actions (no arbitrary code). */
export const CadenceActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move_stage'),
    stageId: z.string().min(1),
    pipelineId: z.string().optional(),
  }),
  z.object({ type: z.literal('mark_lost'), reason: z.string().min(1) }),
  z.object({
    type: z.literal('log_activity'),
    activityType: z.string().min(1),
    subject: z.string().min(1),
    note: z.string().optional(),
  }),
  z.object({ type: z.literal('notify_user'), userId: z.uuid() }),
  z.object({ type: z.literal('set_field'), key: z.string().min(1), value: z.string() }),
  z.object({
    type: z.literal('webhook_out'),
    url: z.url(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
])

export type CadenceAction = z.infer<typeof CadenceActionSchema>

export const CadenceStepSchema = z.object({
  delayMinutes: z.number().int().min(0),
  jitterMinutes: z.number().int().min(0).default(0),
  channelStrategy: z.literal('lead_owner').default('lead_owner'),
  channelPluginId: z.string().min(1).max(100),
  templateId: z.uuid().nullable().default(null),
})

export type CadenceStepInput = z.infer<typeof CadenceStepSchema>

export const CadenceRequestSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(['active', 'inactive']).default('active'),
  stopOnReply: z.boolean().default(true),
  steps: z.array(CadenceStepSchema).min(1),
  onReply: z.array(CadenceActionSchema).default([]),
  onExhausted: z.array(CadenceActionSchema).default([]),
  onComplete: z.array(CadenceActionSchema).default([]),
})

export type CadenceRequest = z.infer<typeof CadenceRequestSchema>

export const CreateCadenceResponseSchema = z.object({ id: z.uuid(), name: z.string() })

export type CreateCadenceResponse = z.infer<typeof CreateCadenceResponseSchema>

export const ListCadencesResponseSchema = z.object({
  cadences: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      status: z.enum(['active', 'inactive']),
      stepCount: z.number().int(),
    }),
  ),
})

export type ListCadencesResponse = z.infer<typeof ListCadencesResponseSchema>

export const CadenceResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  status: z.enum(['active', 'inactive']),
  stopOnReply: z.boolean(),
  steps: z.array(
    z.object({
      stepOrder: z.number().int(),
      delayMinutes: z.number().int(),
      jitterMinutes: z.number().int(),
      channelStrategy: z.literal('lead_owner'),
      channelPluginId: z.string(),
      templateId: z.uuid().nullable(),
    }),
  ),
  onReply: z.array(CadenceActionSchema),
  onExhausted: z.array(CadenceActionSchema),
  onComplete: z.array(CadenceActionSchema),
})

export type CadenceResponse = z.infer<typeof CadenceResponseSchema>
