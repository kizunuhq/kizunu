#!/usr/bin/env bun
// Guard against deep relative imports.
//
// Relative imports that climb two or more directories (`../../../`) are brittle
// and signal a missing tsconfig path alias. This script scans the workspace and
// fails (exit 1) on any such import so CI catches them.

import { join } from 'node:path'

import { Glob } from 'bun'

const DEEP_IMPORT = /from\s+['"](\.\.(\/\.\.){2,})/
const SCAN_DIRS = ['apps', 'packages', 'scripts']

const violations: string[] = []
const root = process.cwd()

for (const dir of SCAN_DIRS) {
  const glob = new Glob('**/*.{ts,tsx}')

  for await (const file of glob.scan({
    cwd: join(root, dir),
    absolute: true,
  })) {
    if (file.includes('node_modules') || file.includes('.turbo')) {
      continue
    }

    const content = await Bun.file(file).text()
    const lines = content.split('\n')

    for (const [i, line] of lines.entries()) {
      if (DEEP_IMPORT.test(line)) {
        violations.push(`  ${file.replace(`${root}/`, '')}:${i + 1}  ${line.trim()}`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    '\x1b[31mRelative imports deeper than 2 levels are not allowed. Use tsconfig path aliases instead.\x1b[0m',
  )
  console.error(violations.join('\n'))
  process.exit(1)
}

console.log('\x1b[32m✓ No deep relative imports found\x1b[0m')
