# Enum Vocabulary Rule Specification

## Problem Statement

ADR-002 settled the pattern for closed domain vocabularies — a `const` object plus its
derived type — but the decision lives only in the ADR. Day-to-day, contributors land
new bare-union vocabularies (`type X = 'a' | 'b'`) that compile, lint, and review-pass
yet violate the spirit of ADR-002 by re-introducing magic strings at every call site.
A repo audit found four such vocabularies already in `apps/api` (Meta plugin steps,
channel credential-field type, channel capability), with magic-string call sites
spreading across plugins, exceptions, and tests. There is no operational rule
(`.agents/rules/*.md`) to cite in review, and no extension pattern documented for the
common case where each vocabulary value carries a different payload shape.

## Goals

- [ ] Add `.agents/rules/enums.md` codifying the const-object pattern as the default,
      the `PayloadMap + Handler<T>` extension for discriminated dispatch, and the two
      narrow exceptions (React variant props; well-known external vocabularies).
- [ ] Refactor the four offending vocabularies to the const-object form and update all
      call sites to use named values — zero behavior change, all existing tests
      continue to pass.
- [ ] Link the rule back to `docs/adr/002-enum-as-const-object.md` so the rationale is
      one click away.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Script enforcement (e.g. `scripts/check-no-bare-union.ts`) | User-deferred: bare unions have legit uses (variant props, internal narrowings) and a regex/AST check cannot distinguish them reliably — would be high-noise. Review-only enforcement for now. |
| New ADR | ADR-002 already records the decision; this is operational guidance. The PayloadMap extension is an application of ADR-002, not a separate architectural choice. |
| `HttpMethod` (api-client and pipedrive), `MarkVariant`, `RunChip`, `Chip` | Documented exceptions: industry-standard HTTP verbs at internal narrowing sites, and React component-prop variants whose JSX call sites always inline the literal. |
| Native TS `enum` keyword ban | Repo already has zero `enum` declarations; no enforcement target. ADR-002 covers the principled rejection. |
| Drizzle `pgEnum` refactors | Already conform to domain vocabularies via the `Assert<Equal<>>` guard (see `docs/adr/003` + memory `layer-boundary-type-guard`). |

---

## User Stories

### P1: Engineer defines a new closed vocabulary ⭐ MVP

**User Story**: As a contributor adding a new closed domain vocabulary (event types,
status codes, plugin field types), I want a single rule to point to so my values
carry named access from day one.

**Why P1**: Without a rule, every new vocabulary is a coin flip between the ADR-002
pattern and a bare union. The next reviewer has nothing to cite except the ADR (which
is for rationale, not enforcement), and bare-union slip-throughs compound.

**Acceptance Criteria**:

1. WHEN a contributor opens `.agents/rules/enums.md` THEN the file SHALL show the
   default rule (`const X = {...} as const; type X = (typeof X)[keyof typeof X]`) as
   the first section with a Good and a Bad example.
2. WHEN a contributor needs an exception (React variant prop or well-known external
   vocabulary like HTTP methods) THEN the rule SHALL state the exception explicitly
   with a worked example so the boundary is unambiguous.
3. WHEN a reviewer flags a bare-union vocabulary in a PR THEN the rule SHALL be
   linkable from `.agents/rules/enums.md` and SHALL cite ADR-002 for rationale.
4. WHEN the rule loads THEN AGENTS.md SHALL list it alongside `conventions.md`,
   `code-standards.md`, `http.md`, `react.md`, `test.md` so it is discoverable by
   agents and humans following the standard rule index.

**Independent Test**: Open `.agents/rules/enums.md`, confirm structure (default rule,
extension pattern, exceptions, ADR link); confirm `AGENTS.md` lists it among the
project rules.

---

### P1: Existing four vocabularies are promoted to const-object form ⭐ MVP

**User Story**: As a maintainer reading the channel/meta plugin code, I want every
domain vocabulary call site to use a named value so renames refactor safely and
magic strings disappear from the codebase.

**Why P1**: Adding the rule without enforcing it on the existing violations leaves
the codebase a counter-example. The four offenders are well-bounded; refactor cost
is small and tests stay green.

**Acceptance Criteria**:

1. WHEN `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception.ts`
   is read THEN it SHALL export `MetaSubscriptionStep` as a `const` object + derived
   type living in its own file per code-standards rule #11 (one type per file).
2. WHEN `meta-subscribe.ts` constructs a failed-subscription path THEN every call
   site SHALL use a named value (`MetaSubscriptionStep.AppSubscription` /
   `.WabaSubscription`) — no magic string literals at the throw site.
3. WHEN `meta-coex-token.ts` calls `readToken(response, step)` THEN `step` SHALL be a
   named value of the promoted `MetaConnectStep` const object.
4. WHEN any channel plugin's manifest declares credential fields THEN
   `ChannelCredentialFieldType.Text` / `.Secret` SHALL appear in place of `'text'` /
   `'secret'` literals.
5. WHEN any channel plugin's manifest declares capabilities THEN
   `ChannelCapability.Freeform` / `.Template` / `.Media` SHALL appear in place of
   the corresponding string literals.
6. WHEN existing tests assert on the **wire payload** (e.g. `{ context: { step:
   'app-subscription' } }`) THEN those literal assertions SHALL stay as-is — the
   refactor is on call sites, not on the wire contract assertion.
7. WHEN `bun check` runs after the refactor THEN it SHALL pass (typecheck, lint,
   all four script checks, every existing unit/integration/e2e test).

**Independent Test**: Each promoted type's file exports the const object + derived
type pair; `rg "step: 'app-subscription'"` returns only test-file matches asserting
wire payloads; `bun check` is green.

---

### P2: Rule documents the PayloadMap discriminated-dispatch extension

**User Story**: As a contributor wiring up a webhook router, event bus, or any
dispatcher whose handlers expect different payloads per event, I want the rule to
show how to keep payload types narrowed without casts.

**Why P2**: The four current violations do not themselves need PayloadMap (their
payloads are uniform), but the extension is the natural next-step the rule enables.
Documenting it now means the next webhook integration (Telegram, SMTP, etc.) lands
type-safely from the first commit.

**Acceptance Criteria**:

1. WHEN a contributor reads the rule's extension section THEN it SHALL show the
   `PayloadMap` + `Handler<T extends X>` pattern using the WebhookEvent example
   (payment.succeeded / payment.failed / refund.created) with both a Good handler
   (payload narrowed by `T`) and a Bad handler (accessing a key not present on the
   narrowed payload — caught at compile time, not runtime).
2. WHEN the example references a value THEN it SHALL use the named const value
   (`WebhookEvent.PaymentSucceeded`) so the rule's example is self-consistent with
   the default rule.

**Independent Test**: The rule file contains a `## Discriminated dispatch via
PayloadMap` section with a compilable Good example and a Bad example that would
fail typecheck.

---

## Edge Cases

- WHEN a vocabulary has exactly two values and is only used as a React component-prop
  variant (e.g. `<KizunuMark variant="full" />`) THEN it MAY remain a bare union;
  the exception is named in the rule.
- WHEN a vocabulary is an internal narrowing of a well-known external string
  vocabulary (e.g. HTTP verbs `'GET' | 'POST' | …` passed to `fetch`) THEN it MAY
  remain a bare union; the exception is named in the rule.
- WHEN a vocabulary lives in `@kizunu/api-contracts` and is derived from a zod schema
  THEN the rule does NOT apply — the schema is the source of truth and the derived
  type is `z.infer<typeof schema>`, not a const-object enum.
- WHEN a Drizzle `pgEnum` lists string values THEN the existing `Assert<Equal<>>`
  guard pattern (ADR-003) applies; this rule's const-object lives in domain code and
  the pgEnum conforms to it (not the other way around).
- WHEN a test asserts the wire shape (`{ step: 'app-subscription' }`) THEN it asserts
  on the literal because the literal IS the wire contract — replacing with the named
  value would weaken the test (no longer verifying the serialized form).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ENUM-01 | P1: New vocab rule | Design | Pending |
| ENUM-02 | P1: New vocab rule (exceptions documented) | Design | Pending |
| ENUM-03 | P1: New vocab rule (ADR link + AGENTS.md index) | Design | Pending |
| ENUM-04 | P1: Promote MetaSubscriptionStep | Design | Pending |
| ENUM-05 | P1: Promote MetaConnectStep | Design | Pending |
| ENUM-06 | P1: Promote ChannelCredentialFieldType | Design | Pending |
| ENUM-07 | P1: Promote ChannelCapability | Design | Pending |
| ENUM-08 | P1: Preserve wire-payload literal assertions | Design | Pending |
| ENUM-09 | P1: `bun check` green gate | Design | Pending |
| ENUM-10 | P2: Document PayloadMap extension | Design | Pending |

**ID format:** `ENUM-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, all mapped to tasks (see tasks.md), 0 unmapped.

---

## Success Criteria

- [ ] `.agents/rules/enums.md` exists, documents the default + extension + exceptions,
      and is listed in AGENTS.md alongside the other rule files.
- [ ] All 4 promote-targets compile as const objects with derived types in their own
      files; all call sites use the named values.
- [ ] `bun check` is green end-to-end (typecheck, lint with CI strictness, vp check,
      all four `scripts/check-*.ts`, drizzle checksums, all tests).
- [ ] No bare-union vocabularies remain in the codebase outside the documented
      exceptions (`HttpMethod` ×2, `MarkVariant`, `RunChip`, `Chip`).
- [ ] PR description quotes the rule and links ADR-002 so future readers find the
      thread.
