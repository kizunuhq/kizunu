# Project Conventions

These rules apply across the monorepo — `apps/` (both `api` and `web`) and the
shared `packages/`. Each rule is enforced by a script in `scripts/` and runs as
part of `bun check`. A few rules are backend-only; that is noted inline.

## 1. Use Top-Level Zod v4 Formats

The project is on zod v4. Import from `zod` and use top-level format helpers
(`z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`) instead of the v3-compat
chained syntax `z.string().<format>()`. This applies everywhere zod is used —
backend, frontend, and shared packages.

Enforced by `scripts/check-zod-v4.ts` (scans `apps/` and `packages/`).

Bad:

```ts
import { z } from 'zod'

const schema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(255),
  createdAt: z.string().datetime(),
})
```

Good:

```ts
import { z } from 'zod'

const schema = z.object({
  id: z.uuid(),
  email: z.email().max(255),
  createdAt: z.iso.datetime(),
})
```

## 2. Do Not Declare Drizzle Column Names

_Backend only (`apps/api/`)._ Column names are derived from field names by `casing: 'snake_case'` in
`apps/api/drizzle.config.ts`. Passing an explicit column name is redundant and
drifts from the field name. Pass options only when needed (e.g. `varchar({ length: N })`).
This does not apply to `pgEnum`, where the enum name is required.

Enforced by `scripts/check-drizzle-schema-naming.ts`.

Bad:

```ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  fullName: text('full_name'),
})
```

Good:

```ts
export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).notNull(),
  fullName: text(),
})
```

## 3. Treat Generated Migrations As Immutable

_Backend only (`apps/api/`)._ Files under `apps/api/drizzle/` are generated. Never hand-edit a `.sql` file or a
snapshot. To change the schema, edit the schema source and run `bun db:generate`,
which regenerates the migration and its checksum manifest (`.checksums.json`).
A manual edit makes a checksum diverge and fails the quality gate.

Enforced by `scripts/drizzle-checksums.ts verify`.

Bad:

```text
# Editing apps/api/drizzle/0000_init.sql by hand to tweak a column.
```

Good:

```text
# Edit apps/api/src/db/schemas/*.ts, then:
bun db:generate
```

## 4. Avoid Deep Relative Imports

Relative imports that climb two or more directories (`../../../`) are brittle and
signal a missing path alias. Use the package's own `src/*` alias instead: in
`apps/api` it is `@kizunu/api/*`, and in `apps/web` it is `@kizunu/web/*`.

Enforced by `scripts/check-import-depth.ts` (scans `apps/`, `packages/`, `scripts/`).

Bad:

```ts
// apps/api
import { users } from '../../../db/schemas/users'
// apps/web
import { Button } from '../../../components/ui/button'
```

Good:

```ts
// apps/api
import { users } from '@kizunu/api/db/schemas/users'
// apps/web
import { Button } from '@kizunu/web/components/ui/button'
```
