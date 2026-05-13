import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgTable, varchar } from 'drizzle-orm/pg-core'

export const workspaces = pgTable('workspaces', {
  ...defaults(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
})

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
