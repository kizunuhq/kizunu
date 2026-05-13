#!/usr/bin/env bun
// Local database environment orchestrator.
//
// Usage:
//   bun scripts/db.ts up       # bring Postgres up via docker compose, wait for healthcheck
//   bun scripts/db.ts down     # stop the container (volume is preserved)
//   bun scripts/db.ts migrate  # apply pending migrations
//   bun scripts/db.ts setup    # up + migrate (bootstrap shortcut)
//   bun scripts/db.ts reset    # drop the volume, bring up clean, migrate (DESTRUCTIVE)
//
// In CI (CI=true) the docker steps can be skipped if the environment already
// provides Postgres — callers can omit `up` and run `migrate` directly.
//
// The compose file lives at deploy/docker-compose.yml.

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HEALTHCHECK_TIMEOUT_MS = 30_000
const HEALTHCHECK_INTERVAL_MS = 500

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const composeFile = resolve(repoRoot, 'deploy/docker-compose.yml')
const containerName = 'kizunu-postgres'
const dbUser = 'postgres'
const dbName = 'kizunu_dev'

function fail(msg: string, code = 1): never {
  process.stderr.write(`\x1b[31m[db] ${msg}\x1b[0m\n`)
  process.exit(code)
}

function info(msg: string): void {
  process.stderr.write(`\x1b[36m[db]\x1b[0m ${msg}\n`)
}

function run(cmd: string, args: string[], opts: { silent?: boolean } = {}): number {
  const r = spawnSync(cmd, args, {
    stdio: opts.silent ? 'pipe' : 'inherit',
    cwd: repoRoot,
    env: process.env,
  })
  return r.status ?? 1
}

function ensureDocker(): void {
  const r = spawnSync('docker', ['info'], { stdio: 'pipe' })
  if (r.status !== 0) {
    fail(
      'Docker is not reachable.\n' +
        '  - Is Docker Desktop running?\n' +
        '  - Does `docker --version` work in your shell?',
    )
  }
}

async function waitHealthy(): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < HEALTHCHECK_TIMEOUT_MS) {
    const r = spawnSync(
      'docker',
      ['exec', containerName, 'pg_isready', '-U', dbUser, '-d', dbName],
      { stdio: 'pipe' },
    )
    if (r.status === 0) return
    await Bun.sleep(HEALTHCHECK_INTERVAL_MS)
  }
  fail(`Postgres did not become ready within ${HEALTHCHECK_TIMEOUT_MS / 1000}s`)
}

function composeUp(): void {
  ensureDocker()
  info('docker compose up postgres')
  const code = run('docker', ['compose', '-f', composeFile, 'up', '-d', 'postgres'])
  if (code !== 0) fail('docker compose up failed', code)
}

function composeDown(removeVolumes = false): void {
  ensureDocker()
  info(`docker compose down${removeVolumes ? ' -v' : ''}`)
  const args = ['compose', '-f', composeFile, 'down']
  if (removeVolumes) args.push('-v')
  const code = run('docker', args)
  if (code !== 0) fail('docker compose down failed', code)
}

function migrate(): void {
  info('drizzle-kit migrate (apps/api)')
  const code = run('bun', ['--filter', '@kizunu/api', 'db:migrate'])
  if (code !== 0) fail('migrate failed', code)
}

async function main(): Promise<void> {
  const cmd = process.argv[2]
  switch (cmd) {
    case 'up': {
      composeUp()
      await waitHealthy()
      info('Postgres ready at postgresql://postgres:postgres@localhost:5432/kizunu_dev')
      return
    }
    case 'down': {
      composeDown(false)
      return
    }
    case 'migrate': {
      migrate()
      return
    }
    case 'setup': {
      composeUp()
      await waitHealthy()
      migrate()
      info('setup complete')
      return
    }
    case 'reset': {
      composeDown(true)
      composeUp()
      await waitHealthy()
      migrate()
      info('reset complete')
      return
    }
    default:
      fail('usage: bun scripts/db.ts <up|down|migrate|setup|reset>', 2)
  }
}

await main()
