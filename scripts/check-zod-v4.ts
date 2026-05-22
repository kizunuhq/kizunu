#!/usr/bin/env bun
/**
 * Guard against zod v3-compat regressions.
 *
 * Kizunu is on zod v4 (catalog: ^4.3.6) and imports the top-level `from 'zod'`
 * entry point, which already resolves to v4 — so the bare import is correct and
 * is NOT flagged here. What this script flags is the chained v3-compat format
 * syntax that v4 replaced with top-level format helpers:
 *
 *   z.string().email(    -> z.email()
 *   z.string().uuid(     -> z.uuid()
 *   z.string().url(      -> z.url()
 *   z.string().datetime( -> z.iso.datetime()
 *
 * Mode: BLOCKING (exit 1 on any violation). It protects against regressions in
 * CI now that the original usages have been migrated to top-level formats.
 *
 * Adapted from spice-target/scripts/check-zod-v4.ts.
 */

import { join } from 'node:path'

import { Glob } from 'bun'

const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'z.string().<format>(',
    regex: /z\.string\(\)\.(email|uuid|url|cuid|nanoid|ulid|datetime)\(/,
  },
]

const SCAN_DIRS = ['apps', 'packages']
const EXT_GLOB = '**/*.{ts,tsx}'
const MAX_PREVIEW = 10

const root = process.cwd()
const violations: string[] = []

for (const dir of SCAN_DIRS) {
  const glob = new Glob(EXT_GLOB)
  for await (const file of glob.scan({
    cwd: join(root, dir),
    absolute: true,
  })) {
    if (
      file.includes('node_modules') ||
      file.includes('.turbo') ||
      file.includes('/dist/') ||
      file.endsWith('.d.ts')
    ) {
      continue
    }

    const content = await Bun.file(file).text()
    const lines = content.split('\n')

    for (const [i, line] of lines.entries()) {
      for (const { name, regex } of PATTERNS) {
        if (regex.test(line)) {
          violations.push(`  ${file.replace(`${root}/`, '')}:${i + 1}  [${name}]  ${line.trim()}`)
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\x1b[31m✗ ${violations.length} zod v3-compat usages found (blocking).\x1b[0m`)
  console.error(
    '  Migrate to top-level formats (z.email, z.uuid, z.url, z.iso.datetime) instead of z.string().<format>().',
  )
  if (process.argv.includes('--verbose')) {
    console.error(violations.join('\n'))
  } else {
    console.error(violations.slice(0, MAX_PREVIEW).join('\n'))
    if (violations.length > MAX_PREVIEW) {
      console.error(`  ... +${violations.length - MAX_PREVIEW} (use --verbose to see all)`)
    }
  }
  process.exit(1)
}

console.log('\x1b[32m✓ No zod v3-compat usage found\x1b[0m')
