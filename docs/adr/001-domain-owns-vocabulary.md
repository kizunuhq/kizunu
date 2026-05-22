# ADR-001: Domain Owns the Vocabulary; Dependencies Point Inward

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: architecture, layering, clean-architecture

## Context and Problem Statement

The API modules follow a layered split (`core` for domain/use-cases, `http` for controllers/guards, `persistence` for repositories) with the Drizzle schema under `db/schemas`. When a vocabulary type (`VerificationTokenType`) was introduced, it ended up born in infra — as a `pgEnum` in the schema and as a local type inside a repository — while the `core` use-cases used raw strings (`'invitation'`). This inverts the dependency rule: the application layer would depend on infra details, and the vocabulary had no clear owner.

## Decision Drivers

- Keep the dependency rule pointing inward (infra → application, never the reverse).
- Domain vocabulary (which token types exist) is an application concept, not a persistence detail.
- Eliminate magic strings scattered across use-cases.

## Considered Options

- **A** — Vocabulary in `core/domain`; infra and use-cases import from there.
- **B** — Vocabulary in `db/schemas` (infra), derived from the `pgEnum`; `core` imports from infra.
- **C** — Status quo: local type in the repository + raw strings in `core`.

## Decision Outcome

Chosen option: **A**, because it is the only one that respects the dependency rule. The domain defines the vocabulary in `core/domain/<thing>.ts` without importing anything from infra; `persistence` and `core/use-cases` import the type from there and use the named values.

### Positive Consequences

- Domain independent of infra; testable and portable.
- Raw strings replaced by type-safe named values.
- A single, obvious home for shared vocabulary.

### Negative Consequences

- The `pgEnum` (infra) and the domain type now carry the same literals in two places — addressed by a boundary guard (see [ADR-003](003-schema-domain-guard.md)).
- A new directory (`core/domain`) per module to maintain.

## Pros and Cons of the Options

### A — Vocabulary in `core/domain` ✅ Chosen
- ✅ Dependency points inward
- ✅ Domain unaware of Drizzle/persistence
- ❌ Literals duplicated between schema and domain

### B — Vocabulary in infra
- ✅ Single source (derives from the `pgEnum`)
- ❌ `core` would depend on infra — violates the dependency rule

### C — Status quo
- ✅ Zero effort
- ❌ Magic strings, no type-safety, no owner

## Links

- Related: [ADR-002](002-enum-as-const-object.md), [ADR-003](003-schema-domain-guard.md)
- First case: `apps/api/src/modules/workspace/core/domain/verification-token.ts`
