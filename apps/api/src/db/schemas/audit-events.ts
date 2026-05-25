import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

import { leadJourneys } from './lead-journeys'
import { workspaces } from './workspaces'

/**
 * Lightweight operational audit log. One row per noteworthy event in the
 * journey lifecycle (created, touch sent, reply received, control flip).
 * The `payload` jsonb is shape-free — readers branch on `kind`. Per-row
 * `workspaceId` keeps reads cheap (no join through leads); `journeyId` is
 * nullable for workspace-wide events (emergency stop, etc.).
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    journeyId: uuid().references(() => leadJourneys.id, { onDelete: 'set null' }),
    kind: varchar({ length: 60 }).notNull(),
    payload: jsonb().notNull().default({}),
  },
  (table) => [
    index('audit_events_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('audit_events_journey_created_idx').on(table.journeyId, table.createdAt),
  ],
)

export type AuditEventRow = typeof auditEvents.$inferSelect
export type NewAuditEvent = typeof auditEvents.$inferInsert
