import { timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Standard columns for every table: time-ordered UUIDv7 primary key plus
 * created/updated timestamps. Spread into table definitions so naming and
 * defaults stay consistent across the schema.
 */
export const defaults = () => ({
  id: uuid()
    .primaryKey()
    .$default(() => Bun.randomUUIDv7()),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
