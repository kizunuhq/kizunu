import { z } from 'zod'

const MINUTE_OF_DAY_MAX = 1440
const DAYS_PER_WEEK = 7

function isSupportedTimezone(timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return formatter.resolvedOptions().timeZone === timezone
  } catch {
    return false
  }
}

/**
 * A cadence-level sending window. Cross-midnight windows (endMinute <
 * startMinute) are rejected at validation; admins split into separate
 * cadences if needed.
 */
export const SendingWindowSchema = z
  .object({
    timezone: z.string().min(1).refine(isSupportedTimezone, {
      message: 'timezone must be a valid IANA timezone (e.g. America/Sao_Paulo)',
    }),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(DAYS_PER_WEEK),
    startMinute: z.number().int().min(0).max(MINUTE_OF_DAY_MAX),
    endMinute: z.number().int().min(0).max(MINUTE_OF_DAY_MAX),
  })
  .refine((window) => window.startMinute < window.endMinute, {
    message: 'startMinute must be less than endMinute',
    path: ['startMinute'],
  })

export type SendingWindowInput = z.infer<typeof SendingWindowSchema>

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
  sendingWindow: SendingWindowSchema.nullable().default(null),
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
  sendingWindow: SendingWindowSchema.nullable(),
})

export type CadenceResponse = z.infer<typeof CadenceResponseSchema>
