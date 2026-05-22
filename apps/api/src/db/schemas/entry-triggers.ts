import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { cadences } from './cadences'
import { connectorAccounts } from './connector-accounts'
import { workspaces } from './workspaces'

/**
 * Maps a CRM pipeline stage to the cadence that should start when a deal enters it.
 * The engine reads this on a normalized `lead.stage_entered` event. One cadence per
 * (connector account, stage); `pipelineId` is optional (null matches any pipeline).
 */
export const entryTriggers = pgTable(
  'entry_triggers',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectorAccountId: uuid()
      .notNull()
      .references(() => connectorAccounts.id, { onDelete: 'cascade' }),
    pipelineId: varchar({ length: 100 }),
    stageId: varchar({ length: 100 }).notNull(),
    cadenceId: uuid()
      .notNull()
      .references(() => cadences.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('entry_triggers_account_stage_idx').on(table.connectorAccountId, table.stageId),
    index('entry_triggers_workspace_idx').on(table.workspaceId),
  ],
)

export type EntryTrigger = typeof entryTriggers.$inferSelect
export type NewEntryTrigger = typeof entryTriggers.$inferInsert
