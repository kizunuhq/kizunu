import * as schema from '@kizunu/api/db/schemas'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const connectionString =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/kizunu_test'

export const pool = new Pool({ connectionString })
export const db = drizzle(pool, { schema, casing: 'snake_case' })

export async function truncateAll(tables: readonly string[]): Promise<void> {
  if (tables.length === 0) {
    return
  }
  const list = tables.map((t) => `"${t}"`).join(', ')
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`))
}

export async function closeDb(): Promise<void> {
  await pool.end()
}
