import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { integer, pgEnum, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { cadences } from './cadences'
import { templates } from './templates'

export const channelStrategyEnum = pgEnum('channel_strategy', ['lead_owner'])

/**
 * One step of a cadence. `stepOrder` is the position in the sequence (derived from the
 * input array). `channelStrategy` resolves which channel account sends it (`lead_owner`
 * → the lead owner's primary). A null `templateId` is a freeform step (engine sends
 * inline text inside the 24h window).
 */
export const cadenceSteps = pgTable(
  'cadence_steps',
  {
    ...defaults(),
    cadenceId: uuid()
      .notNull()
      .references(() => cadences.id, { onDelete: 'cascade' }),
    stepOrder: integer().notNull(),
    delayMinutes: integer().notNull(),
    jitterMinutes: integer().notNull().default(0),
    channelStrategy: channelStrategyEnum().notNull().default('lead_owner'),
    channelPluginId: varchar({ length: 100 }).notNull(),
    templateId: uuid().references(() => templates.id, { onDelete: 'set null' }),
  },
  (table) => [uniqueIndex('cadence_steps_cadence_order_idx').on(table.cadenceId, table.stepOrder)],
)

export type CadenceStep = typeof cadenceSteps.$inferSelect
export type NewCadenceStep = typeof cadenceSteps.$inferInsert
