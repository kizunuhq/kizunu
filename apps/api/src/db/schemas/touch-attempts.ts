import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { integer, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { leadJourneys } from './lead-journeys'

/**
 * One record per dispatched step of a journey. The unique `(leadJourneyId, stepOrder)`
 * is the D1 idempotency guard: inserted inside the dispatch transaction before the
 * channel is called, so a retry/race cannot send the same step twice.
 * `externalMessageId`/`externalActivityId` correlate the touch with the channel + CRM.
 */
export const touchAttempts = pgTable(
  'touch_attempts',
  {
    ...defaults(),
    leadJourneyId: uuid()
      .notNull()
      .references(() => leadJourneys.id, { onDelete: 'cascade' }),
    stepOrder: integer().notNull(),
    status: varchar({ length: 20 }).notNull(),
    externalMessageId: varchar({ length: 255 }),
    externalActivityId: varchar({ length: 255 }),
    error: text(),
  },
  (table) => [
    uniqueIndex('touch_attempts_journey_step_idx').on(table.leadJourneyId, table.stepOrder),
  ],
)

export type TouchAttempt = typeof touchAttempts.$inferSelect
export type NewTouchAttempt = typeof touchAttempts.$inferInsert
