# ADR-003: Compile-Time Layer-Boundary Guard for Schema↔Domain Conformance

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: typescript, architecture, persistence, type-safety

## Context and Problem Statement

[ADR-001](001-domain-owns-vocabulary.md) put the vocabulary in the domain, but the Drizzle `pgEnum` (infra) still declares the same literals independently — Drizzle's migration tooling needs them spelled out in the schema. That leaves two sources that can silently drift: someone adds a value to the domain but not the `pgEnum` (or vice-versa), and nothing fails until runtime. We wanted the drift to surface **at the layer boundary, in infra**, never in the domain.

## Decision Drivers

- Detect schema/domain divergence at compile time, not at runtime.
- The failure must land in infra (the adapter conforming to the domain contract), keeping the domain unaware of infra.
- Reusable across every enum/schema, with minimal ceremony per use.

## Considered Options

- **A** — A compile-time type assertion (`Assert<Equal<schemaValues, DomainType>>`) declared in the schema file.
- **B** — Generate the `pgEnum` from the domain const (`Object.values(...)`), making drift impossible by construction.
- **C** — A runtime check (e.g. a unit test) asserting the two sets match.

## Decision Outcome

Chosen option: **A**. The schema stays declarative (good for Drizzle migrations), imports the domain type, and declares `export type _SchemaMatchesDomain = Assert<Equal<(typeof enumValues)[number], DomainType>>`. If the two diverge, compilation breaks on that line — in infra — with `Type 'false' does not satisfy the constraint 'true'`. The `Assert` and `Equal` helpers live in `@kizunu/nestjs-shared/lib/types/type-assert`.

Two implementation notes carried by this decision:
- We export `Assert` and `Equal` and compose them at the call site. A combined `AssertEqual<A, B>` cannot work: with `A`/`B` still generic, `Equal<A, B>` widens to `boolean` and the `extends true` constraint is checked at the alias definition, not at instantiation.
- The guard type is `export`ed only to satisfy `noUnusedLocals`; the `_` prefix marks it as internal.

### Positive Consequences

- Drift becomes a build error at the exact boundary line.
- The domain never imports infra; the adapter conforms to the domain.
- One small, reusable helper for all future enums.

### Negative Consequences

- A small amount of boilerplate (`export type _SchemaMatchesDomain = ...`) per schema.
- The `export`-to-silence-`noUnusedLocals` trick is slightly unidiomatic.

## Pros and Cons of the Options

### A — Compile-time assertion ✅ Chosen
- ✅ Build-time detection, located in infra
- ✅ Schema stays declarative for migrations
- ❌ Per-schema boilerplate; `export` workaround for `noUnusedLocals`

### B — Generate `pgEnum` from the domain
- ✅ Drift impossible by construction; zero duplication
- ❌ Schema becomes less declarative; tuple cast required; harder for migration tooling to read

### C — Runtime test
- ✅ No type gymnastics
- ❌ Fails only when the test runs, not at the boundary; easy to forget

## Links

- Builds on: [ADR-001](001-domain-owns-vocabulary.md), [ADR-002](002-enum-as-const-object.md)
- Helper: `packages/nestjs-shared/src/lib/types/type-assert.ts`
- First case: `apps/api/src/db/schemas/verification-tokens.ts`
