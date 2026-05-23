# Enum Vocabulary Rule Design

**Spec**: `.specs/features/032-enum-vocabulary-rule/spec.md`
**Status**: Draft

---

## Architecture Overview

Two deliverables, both pure-text / pure-refactor (no new modules, no new runtime code):

1. **Rule artifact** (`.agents/rules/enums.md`) — operational guidance, linked from
   `AGENTS.md` alongside the other five rule files. Cites ADR-002 for rationale.
2. **Refactor artifact** — four bare-union vocabularies promoted to the const-object
   form, with every call site updated to the named value. Wire-payload test
   assertions stay literal (they verify the serialized contract, not the call-site
   identifier).

No runtime behavior change. No new tests required — existing test suites already
exercise every refactored call site (the contract assertions verify the same
emitted string). The refactor is mechanical and the typechecker is the safety net.

---

## Code Reuse Analysis

### Existing patterns to mirror

| Component | Location | How to use |
| --------- | -------- | ---------- |
| `VerificationTokenType` | `apps/api/src/modules/workspace/core/domain/verification-token.ts` | Canonical const-object + derived-type template. The four promoted vocabularies copy this exact shape. |
| `JourneyEvent` | `apps/api/src/modules/engine/core/domain/journey-event.ts` | Same template; demonstrates the pattern at module-domain scope. |
| `LeadJourneyStatus` | `apps/api/src/modules/engine/core/domain/lead-journey-status.ts` | Same template; also shows the domain-owns-vocabulary pattern that pgEnum conforms to. |
| ADR-002 | `docs/adr/002-enum-as-const-object.md` | Source of truth for the decision. The rule cites it for rationale. |
| Rule file convention | `.agents/rules/{conventions,code-standards,http,react,test}.md` | New file follows the same H1 + numbered-section + Good/Bad examples format. |
| AGENTS.md rule index | `AGENTS.md` § "Conventions and rules" | New rule file gets a bullet alongside the existing five. |

### Integration points

| System | Integration method |
| ------ | ------------------ |
| `AGENTS.md` | Add one bullet under "Conventions and rules" pointing at `enums.md`. No other AGENTS.md changes (the user's standing instruction is never edit AGENTS.md without an explicit ask — but adding a rule to the rule index is the standard operating procedure when a new rule lands, per its own format). **Verify with user before saving** if there's any ambiguity. |
| `docs/adr/002-enum-as-const-object.md` | Read-only link target; ADRs are immutable. The rule file links to the ADR; the ADR is not modified. |
| Existing rule files | Format consistency only — no edits to other rule files. |

### CONCERNS.md check

No flagged components touched. Channel plugin code (where the four vocabularies live)
is not on the CONCERNS list. Refactor risk is low; gate is `bun check`.

---

## Components

### Rule file: `.agents/rules/enums.md`

- **Purpose**: Operational rule for closed-vocabulary types — when to use a const
  object + derived type, when to use the PayloadMap extension, when bare unions
  are acceptable.
- **Location**: `.agents/rules/enums.md`
- **Structure**:
  - H1 + intro: scope, link to ADR-002 for rationale.
  - § 1 "Default: const object + derived type" — the Good shape, Bad alternatives
    (native `enum`, bare union), and a worked example.
  - § 2 "Extension: discriminated dispatch via PayloadMap" — the WebhookEvent
    example from the user's request, with a Good handler (payload narrows by `T`)
    and a Bad handler (accessing a missing key — caught at compile time).
  - § 3 "Exceptions: when bare unions are fine" — two named exceptions with worked
    examples: (a) React component-prop variant types whose JSX call sites always
    inline the literal; (b) internal narrowings of well-known external
    vocabularies (e.g. HTTP method names passed to `fetch`).
  - § 4 "Related" — back-link ADR-002 and the canonical in-repo examples
    (`verification-token.ts`, `journey-event.ts`, `lead-journey-status.ts`).
- **Interfaces**: N/A (text artifact).
- **Dependencies**: None — pure documentation.
- **Reuses**: Format of existing rule files (numbered sections, Good/Bad fenced
  code blocks, no semicolons / single quotes / Tailwind-sorted in any TS examples).

### Refactor: 4 const-object promotions

Each follows the same template — the file currently exports a bare union; it becomes
a `const` object literal + a derived type sharing the same identifier (declaration
merging, the ADR-002 pattern). The file lives in its own location per code-standards
rule #11 (one type per file). The kebab-case file name is unchanged where it already
matches the type (e.g. `channel-credential-field-type.ts`), and the existing JSDoc
above the type is preserved.

#### 1. `MetaSubscriptionStep`

- **File**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception.ts`
- **Change**: Bare union promoted in-file. The exception class continues to import
  the type from the same module. **Note:** the type currently lives in the same
  file as the exception class — splitting into its own file would satisfy
  code-standards rule #11 strictly. We split it: new file
  `meta-subscription-step.ts` holds the const-object + type; the exception imports
  it. Mirrors the `verification-token-type` ↔ `verification-token-repository` split
  style in the workspace module.
- **Named values**: `AppSubscription = 'app-subscription'`,
  `WabaSubscription = 'waba-subscription'` (PascalCase keys per code-standards
  rule #3).
- **Call sites to update** (named values, not literals):
  - `meta-subscribe.ts:67` — `step: 'app-subscription'` → `step: MetaSubscriptionStep.AppSubscription`
  - `meta-subscribe.ts:89` — `step: 'waba-subscription'` → `step: MetaSubscriptionStep.WabaSubscription`
- **Test files** (assertions stay literal — they verify the wire shape):
  - `__test__/unit/meta-subscribe.spec.ts:81,147,200`
  - `__test__/unit/meta-whatsapp.plugin.spec.ts:231,249`

#### 2. `MetaConnectStep`

- **File**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-connect-failed.exception.ts`
- **Change**: Same split — new file `meta-connect-step.ts`; exception imports it.
- **Named values**: `CodeExchange = 'code-exchange'`, `RefreshExchange = 'refresh-exchange'`.
- **Call sites to update**:
  - `meta-coex-token.ts:56` — `readToken(response, 'code-exchange')` →
    `readToken(response, MetaConnectStep.CodeExchange)`
  - `meta-coex-token.ts:75` — `readToken(response, 'refresh-exchange')` →
    `readToken(response, MetaConnectStep.RefreshExchange)`
- **Test files** (literal assertions stay): `__test__/unit/meta-coex-token.spec.ts:75,135`,
  `__test__/unit/meta-whatsapp.plugin.spec.ts:369`.

#### 3. `ChannelCredentialFieldType`

- **File**: `apps/api/src/modules/channel/core/plugin/channel-credential-field-type.ts`
- **Change**: Already in its own file. Bare union → const-object + derived type.
- **Named values**: `Text = 'text'`, `Secret = 'secret'`.
- **Call sites to update** (everywhere a plugin manifest's `credentialFields`
  declares `type: 'text'` or `type: 'secret'`):
  - `meta-whatsapp.plugin.ts:60,61,62,63,64,70` (six entries; mix of text/secret)
  - `core/plugin/__test__/fake-channel-plugin.ts:29,30`
- **Test files** (literal assertions stay): `__test__/unit/meta-whatsapp.plugin.spec.ts:143`.

#### 4. `ChannelCapability`

- **File**: `apps/api/src/modules/channel/core/plugin/channel-capability.ts`
- **Change**: Already in its own file. Bare union → const-object + derived type.
- **Named values**: `Freeform = 'freeform'`, `Template = 'template'`, `Media = 'media'`.
- **Call sites to update**:
  - `meta-whatsapp.plugin.ts:57` — `capabilities: ['freeform', 'template']` →
    `[ChannelCapability.Freeform, ChannelCapability.Template]`
  - `core/plugin/__test__/fake-channel-plugin.ts:26` — same shape
- **Test files** (literal assertions stay): `__test__/unit/meta-whatsapp.plugin.spec.ts:28`,
  `core/plugin/__test__/unit/channel-plugin-registry.spec.ts:43`.

**Not touched** (the `mode: 'freeform' | 'template'` fields in `channel-decision.ts`
and `send-payload.ts`, plus call sites in `meta-send.ts` and `meta-whatsapp.plugin.ts`
that check `mode === 'template'` etc.). These are intentionally separate
narrowings — `mode` is a per-message decision field, not the static
`ChannelCapability` vocabulary. The current shape doesn't reuse `ChannelCapability`
even though the literal values overlap, and unifying them is out of scope for this
feature (would change the runtime type relationship). Documented here so the next
contributor doesn't misread the boundary.

---

## Data Models

N/A — no schema or model changes. The promotion is a TypeScript type/value
transformation; the runtime payload (the string carried on the wire and persisted
in `users.emailVerifiedAt`-style columns) is byte-for-byte identical before and
after.

---

## Error Handling Strategy

| Scenario | Handling | User impact |
| -------- | -------- | ----------- |
| Typecheck fails after promoting a vocabulary (caller passes a literal) | `bun typecheck` catches it; fix the caller to use the named value | None — caught pre-commit |
| Literal assertion in a test fails because we accidentally changed the wire value | Should not happen (named-value key → same string literal value); if it does, fix the const-object value, not the test | None — caught by `bun check` |
| Drizzle pgEnum reference (if any) | None exist for the 4 promoted vocabularies; ADR-003 `Assert<Equal<>>` guard is only relevant for the existing `lead_journey_status` enum, unchanged here | N/A |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Split `MetaSubscriptionStep` / `MetaConnectStep` into their own files | Yes (new files) | Code-standards rule #11 ("one type per file") and code-readers stop reading the exception class as the type's documentation. Adds one import per consumer, removes one mental layer. |
| Keep wire-payload literal assertions in tests as literals | Yes | A test that asserts `{ step: 'app-subscription' }` is verifying the serialized contract — what goes on the HTTP response. Replacing with `MetaSubscriptionStep.AppSubscription` would weaken the test (it would no longer catch a wire-value rename). Tests of contracts assert literals; tests of behavior assert named values. |
| `as const` ordering (key-value pairs sorted by value? by key? insertion?) | Insertion order matching existing examples | The three existing canonical files (`verification-token.ts`, `journey-event.ts`, `lead-journey-status.ts`) all use insertion order grouped by logical meaning. We match. The formatter doesn't sort object keys. |
| PayloadMap example in the rule | Use the WebhookEvent example verbatim from the user's request (with `PaymentSucceeded` spelling corrected — the user's draft had `PaymentSucceded`) | Demonstrates the pattern on a domain the team will immediately recognize, and the typo would land in the rule otherwise. |
| Don't refactor `mode: 'freeform' \| 'template'` in `channel-decision.ts` / `send-payload.ts` | Skip | These are not the `ChannelCapability` vocabulary even though the literals overlap — `mode` is a per-message decision, `ChannelCapability` is the static manifest declaration. Unifying them is a separate scope decision (out of scope for this feature). |
| Add a script check (`scripts/check-no-bare-union.ts`) | No (out of scope) | The user opted for rule-only enforcement; bare unions have legitimate uses (React variants, internal narrowings) and a script cannot reliably classify the boundary. |

---

## Test Strategy

Per AGENTS.md / `generate-tests`, classify the work:

- **Rule file** — pure documentation. Thin. No tests.
- **Const-object promotions** — pure type/identifier change with identical runtime
  string values. Thin. No new tests required.
- **Existing tests as the safety net** — the unit/integration/e2e suites already
  exercise every refactored call site (via plugin manifest reads, exception
  throws, webhook payload assertions). `bun check` is the gate that confirms the
  refactor is value-preserving.

`generate-tests` is not invoked for this feature because there is no new behavior
to classify. If `bun check` surfaces a test that breaks because it was *coincidentally*
relying on something the refactor changes, that test gets a focused fix at that
point — not pre-emptive new tests.
