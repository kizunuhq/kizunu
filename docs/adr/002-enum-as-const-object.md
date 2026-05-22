# ADR-002: Enum-like Types as a Derived `const` Object

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: typescript, conventions, domain

## Context and Problem Statement

Closed domain vocabularies (e.g. verification token types) need to expose both the **named values** for use in code and a **type** for annotation. There was inconsistency: some places used `type X = 'a' | 'b'` (a bare union, with no accessible values), others used raw strings. We needed a single convention.

## Decision Drivers

- Access to named values (`X.Invitation`) instead of magic strings.
- Type-safety and refactorability (a rename catches every usage).
- Avoid the runtime/iteration pitfalls of TypeScript's native `enum`.

## Considered Options

- **A** — `const` object + derived type: `const X = {...} as const; type X = (typeof X)[keyof typeof X]`.
- **B** — TypeScript's native `enum`.
- **C** — Literal union type: `type X = 'a' | 'b'`.

## Decision Outcome

Chosen option: **A**. The `as const` object gives the named values at runtime, and the type is derived from it — a single source for value and type. It avoids the native `enum` (which emits runtime code, has nominal behavior, and quirky reverse iteration) and beats the bare union (which offers no accessible values).

### Positive Consequences

- Type-safe named values (`VerificationTokenType.Invitation`).
- No extra runtime code beyond the object literal.
- A single, recognizable pattern across the codebase.

### Negative Consequences

- More verbose than a one-line union.
- Type and const share the same name (declaration merging) — intentional, but requires familiarity.

## Pros and Cons of the Options

### A — `const` object + derived type ✅ Chosen
- ✅ Named values + type from one source
- ✅ None of the native `enum` quirks
- ❌ More verbose

### B — Native `enum`
- ✅ Compact syntax
- ❌ Emits runtime, nominal behavior, confusing reverse iteration
- ❌ Discouraged by much of the TS community

### C — Literal union
- ✅ Minimal
- ❌ No accessible values → back to magic strings

## Links

- Related: [ADR-001](001-domain-owns-vocabulary.md)
- First case: `apps/api/src/modules/workspace/core/domain/verification-token.ts`
