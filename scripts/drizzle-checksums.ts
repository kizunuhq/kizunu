#!/usr/bin/env bun
/**
 * SHA-256 manifest for Drizzle migrations.
 *
 * `drizzle-kit check` validates only sequence/journal — it does not detect
 * manual edits to the contents of a `.sql` file or a snapshot. This script
 * fills that gap: every file under `apps/api/drizzle/` (including `meta/`) has
 * its hash recorded in `.checksums.json`. A manual edit makes a hash diverge,
 * so `check` fails.
 *
 * Modes:
 *   generate  — recompute `.checksums.json` from the current state.
 *               Runs as a postscript of `db:generate`.
 *   verify    — compare the current state against the committed manifest.
 *               Runs in the quality gate (default mode).
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = join(ROOT, 'apps', 'api', 'drizzle')
const MANIFEST_PATH = join(MIGRATIONS_DIR, '.checksums.json')

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function collect(): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  await walk(MIGRATIONS_DIR)
  return result

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir)
    for (const name of entries) {
      // Skip the manifest itself.
      if (name === '.checksums.json') {
        continue
      }
      const full = join(dir, name)
      const st = await stat(full)
      if (st.isDirectory()) {
        await walk(full)
        continue
      }
      const buf = await readFile(full)
      const rel = relative(MIGRATIONS_DIR, full)
      result[rel] = createHash('sha256').update(buf).digest('hex')
    }
  }
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}

async function generate(): Promise<void> {
  if (!(await exists(MIGRATIONS_DIR))) {
    console.log('✓ drizzle-checksums: no migrations dir yet')
    return
  }
  const manifest = sortKeys(await collect())
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`✓ drizzle-checksums: manifest written (${Object.keys(manifest).length} files)`)
}

async function verify(): Promise<void> {
  if (!(await exists(MIGRATIONS_DIR))) {
    console.log('✓ drizzle-checksums: no migrations dir yet')
    return
  }
  if (!(await exists(MANIFEST_PATH))) {
    console.error('✗ drizzle-checksums: manifest missing — run `bun run db:generate`')
    process.exit(1)
  }

  const expected: Record<string, string> = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'))
  const actual = await collect()

  const violations: string[] = []
  for (const [file, hash] of Object.entries(expected)) {
    if (!(file in actual)) {
      violations.push(`removed: ${file}`)
      continue
    }
    if (actual[file] !== hash) {
      violations.push(`changed: ${file}`)
    }
  }
  for (const file of Object.keys(actual)) {
    if (!(file in expected)) {
      violations.push(`untracked: ${file}`)
    }
  }

  if (violations.length === 0) {
    console.log(`✓ drizzle-checksums: ${Object.keys(actual).length} files intact`)
    return
  }

  console.error(
    `✗ drizzle-checksums: ${violations.length} violation(s) — only \`db:generate\` may touch migrations/\n`,
  )
  for (const v of violations) {
    console.error(`   ${v}`)
  }
  process.exit(1)
}

const mode = process.argv[2]
if (mode === 'generate') {
  await generate()
} else if (mode === 'verify' || mode === undefined) {
  await verify()
} else {
  console.error('usage: drizzle-checksums.ts [generate|verify]')
  process.exit(2)
}
