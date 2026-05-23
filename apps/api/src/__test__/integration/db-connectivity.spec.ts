import { sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vite-plus/test'

import { closeDb, db, truncateAll } from './db'

describe('integration harness (DB)', () => {
  afterAll(async () => {
    await closeDb()
  })

  it('connects to the test database', async () => {
    const result = await db.execute(sql`select 1 as one`)
    expect(result.rows[0]).toEqual({ one: 1 })
  })

  it('truncateAll([]) is a no-op while the table list is empty', async () => {
    await expect(truncateAll([])).resolves.toBeUndefined()
  })
})
