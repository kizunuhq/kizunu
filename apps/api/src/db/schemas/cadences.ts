import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { boolean, jsonb, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

import type { SendingWindow } from '../../modules/cadence/core/domain/sending-window'
import { workspaces } from './workspaces'

export const cadenceStatusEnum = pgEnum('cadence_status', ['active', 'inactive'])

/**
 * The cadence aggregate: a named, ordered sequence of steps with a stop policy and
 * closed-vocabulary exit hooks. Not a workflow graph — no arbitrary branching. Hooks
 * are stored as `CadenceAction[]` and interpreted by the engine.
 */
export const cadences = pgTable('cadences', {
  ...defaults(),
  workspaceId: uuid()
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar({ length: 120 }).notNull(),
  status: cadenceStatusEnum().notNull().default('active'),
  stopOnReply: boolean().notNull().default(true),
  onReply: jsonb().$type<CadenceAction[]>().notNull().default([]),
  onExhausted: jsonb().$type<CadenceAction[]>().notNull().default([]),
  onComplete: jsonb().$type<CadenceAction[]>().notNull().default([]),
  sendingWindow: jsonb().$type<SendingWindow>(),
})

export type Cadence = typeof cadences.$inferSelect
export type NewCadence = typeof cadences.$inferInsert
