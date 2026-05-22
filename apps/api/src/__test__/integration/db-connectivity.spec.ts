import { sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vite-plus/test'

import { closeDb, db, truncateAll } from './db'

// Smoke test for the integration harness: proves we connect to kizunu_test and
// the helpers work. Replace with repository/use-case tests as the suite grows.
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
