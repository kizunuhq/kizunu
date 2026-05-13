import { $ } from 'bun'

const staged = (await $`git diff --cached --name-only --diff-filter=ACMR`.text())
  .trim()
  .split('\n')
  .filter(Boolean)

if (!staged.length) process.exit(0)

const files = staged.filter((f) => !f.startsWith('.claude/') && !f.startsWith('.agents/'))

if (files.length) await $`bunx vp check --fix ${files}`

await $`git update-index --again`
await $`git diff --cached --check`
