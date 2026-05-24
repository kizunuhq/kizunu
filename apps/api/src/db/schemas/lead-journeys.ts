import type { Assert, Equal } from '@kizunu/nestjs-shared/lib/types/type-assert'
import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { LeadJourneyStatus } from '../../modules/engine/core/domain/lead-journey-status'
import { cadences } from './cadences'
import { leads } from './leads'

const leadJourneyStatusValues = [
  'running',
  'paused',
  'replied',
  'exhausted',
  'stopped',
  'error_state',
  'paused_owner_inactive',
] as const

export const leadJourneyStatusEnum = pgEnum('lead_journey_status', leadJourneyStatusValues)

export type _LeadJourneyStatusMatchesDomain = Assert<
  Equal<(typeof leadJourneyStatusValues)[number], LeadJourneyStatus>
>

/**
 * Execution state per (lead, cadence) — the engine's unit of work. The poller selects
 * journeys with `status = 'running'` and `nextTouchAt <= now`; `currentStepOrder` is
 * the last dispatched step (`-1` before the first). Status transitions follow the D1
 * state machine.
 */
export const leadJourneys = pgTable(
  'lead_journeys',
  {
    ...defaults(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    cadenceId: uuid()
      .notNull()
      .references(() => cadences.id, { onDelete: 'cascade' }),
    status: leadJourneyStatusEnum().notNull().default('running'),
    currentStepOrder: integer().notNull().default(-1),
    nextTouchAt: timestamp({ withTimezone: true }),
    errorReason: varchar({ length: 80 }),
  },
  (table) => [index('lead_journeys_status_next_touch_idx').on(table.status, table.nextTouchAt)],
)

export type LeadJourney = typeof leadJourneys.$inferSelect
export type NewLeadJourney = typeof leadJourneys.$inferInsert
