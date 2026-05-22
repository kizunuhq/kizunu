#!/usr/bin/env bun

/**
 * Schema convention: column names are inferred from field names via
 * `casing: 'snake_case'` in apps/api/drizzle.config.ts. Declaring the
 * column name explicitly is redundant and creates drift across schemas.
 *
 * Flags `text('foo')`, `varchar('foo', ...)`, `uuid('foo')`, etc. in
 * apps/api/src/db/schemas/*.ts. Allows zero-arg or options-only calls.
 * Excludes `pgEnum('name', ...)` (table/enum names are required).
 *
 * Exits non-zero on violation.
 *
 * Adapted from doutor-pac/scripts/check-drizzle-schema-naming.ts.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Glob } from 'bun'

const COLUMN_TYPES = [
  'bigint',
  'boolean',
  'char',
  'date',
  'decimal',
  'doublePrecision',
  'integer',
  'interval',
  'json',
  'jsonb',
  'numeric',
  'real',
  'serial',
  'smallint',
  'text',
  'time',
  'timestamp',
  'uuid',
  'varchar',
]

const pattern = new RegExp(`\\b(${COLUMN_TYPES.join('|')})\\(\\s*['"][^'"]+['"]`, 'g')

const root = process.cwd()
const schemaDir = join(root, 'apps/api/src/db/schemas')
const violations: string[] = []

const glob = new Glob('*.ts')
for await (const file of glob.scan({ cwd: schemaDir, absolute: true })) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')
  for (const [i, raw] of lines.entries()) {
    const line = raw ?? ''
    if (line.trim().startsWith('//')) {
      continue
    }
    const matches = line.matchAll(pattern)
    for (const m of matches) {
      violations.push(
        `${file.replace(`${root}/`, '')}:${i + 1} — \`${m[0]}\` declares column name; rely on snake_case casing instead`,
      )
    }
  }
}

if (violations.length > 0) {
  console.error('\x1b[31m✗ Drizzle schema naming violations:\x1b[0m')
  for (const v of violations) {
    console.error(`  ${v}`)
  }
  console.error(
    '\n  Convention: drizzle.config.ts has `casing: "snake_case"`.\n' +
      '  Use `text()`, `varchar({ length: N })`, `uuid()` — drop the explicit name arg.',
  )
  process.exit(1)
}

console.log('\x1b[32m✓ Drizzle schema naming OK (no explicit column names)\x1b[0m')
