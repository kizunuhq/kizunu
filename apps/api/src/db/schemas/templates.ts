import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { jsonb, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { workspaces } from './workspaces'

/**
 * A message template a cadence step can reference. For Meta this is an HSM reference
 * (`providerTemplateName` + `language` + ordered `variables`), not a freeform body —
 * freeform is only valid inside the 24h window. `name` is the internal label, unique
 * within a workspace.
 */
export const templates = pgTable(
  'templates',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar({ length: 120 }).notNull(),
    channelPluginId: varchar({ length: 100 }).notNull(),
    providerTemplateName: varchar({ length: 255 }).notNull(),
    language: varchar({ length: 20 }).notNull(),
    variables: jsonb().$type<string[]>().notNull().default([]),
  },
  (table) => [uniqueIndex('templates_workspace_name_idx').on(table.workspaceId, table.name)],
)

export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
