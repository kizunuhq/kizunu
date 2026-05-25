import { z } from 'zod'

export const LeadJourneyStatusSchema = z.enum([
  'running',
  'paused',
  'replied',
  'exhausted',
  'stopped',
  'error_state',
  'paused_owner_inactive',
])

export type LeadJourneyStatusValue = z.infer<typeof LeadJourneyStatusSchema>

export const ListLeadJourneysQuerySchema = z.object({
  status: LeadJourneyStatusSchema.optional(),
})

export type ListLeadJourneysQuery = z.infer<typeof ListLeadJourneysQuerySchema>

export const ListLeadJourneysResponseSchema = z.object({
  journeys: z.array(
    z.object({
      id: z.uuid(),
      leadName: z.string(),
      cadenceId: z.uuid(),
      status: LeadJourneyStatusSchema,
      currentStepOrder: z.number().int(),
      nextTouchAt: z.iso.datetime().nullable(),
      errorReason: z.string().nullable(),
    }),
  ),
})

export type ListLeadJourneysResponse = z.infer<typeof ListLeadJourneysResponseSchema>
