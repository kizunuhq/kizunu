import { spawnSync } from 'node:child_process'

import { Client } from 'pg'

// Vitest globalSetup for the DB-backed projects (integration, e2e). Runs once,
// before any test file. Verifies the test database is reachable and, if not,
// brings it up via `bun db:test:setup` (idempotent: compose up + create +
// migrate). This makes `vp test` / `bun check` self-sufficient — no manual
// `db:test:setup` step required.

const CONNECT_TIMEOUT_MS = 2000

const testDbUrl =
  process.env['TEST_DATABASE_URL'] ??
  process.env['APP_DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5432/kizunu_test'

async function canConnect(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MS })
  try {
    await client.connect()
    await client.end()
    return true
  } catch {
    return false
  }
}

export default async function setup(): Promise<void> {
  if (await canConnect(testDbUrl)) {
    return
  }

  // Not reachable — ensure it is up. `db:test:setup` is safe to re-run.
  process.stderr.write('[test] test database unreachable — running `db:test:setup`...\n')
  const result = spawnSync('bun', ['scripts/db.ts', 'test:setup'], { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error('Failed to bring up the test database. Run `bun db:test:setup` manually.')
  }

  if (!(await canConnect(testDbUrl))) {
    throw new Error(`Test database still unreachable at ${testDbUrl} after setup.`)
  }
}
