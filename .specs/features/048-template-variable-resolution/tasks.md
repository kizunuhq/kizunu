# 048 — Template Variable Resolution Tasks

**Spec:** `.specs/features/048-template-variable-resolution/spec.md`
**Design:** `.specs/features/048-template-variable-resolution/design.md`
**Status:** Approved

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6
```

Linear because each task builds on the previous: resolver first, then
exceptions, then enum additions, then dispatcher wire-up, then Meta plugin
mapping, then docs close-out.

---

## Task Breakdown

### T1: Add `TemplateVariableUnresolvedException` + `TemplateVariableUnknownException`

**What:** Two engine-internal exception classes carrying the variable name.

**Where:** `apps/api/src/modules/engine/core/errors/template-variable.errors.ts`
(new).

**Done when:**
- Both classes extend `Error` (engine-internal; not `ApplicationException`).
- Each exposes `variableName: string`.
- Gate: `bun typecheck`.

**Tests:** none (covered by resolver unit spec).
**Gate:** build.

---

### T2: Add `LeadJourneyErrorReason.TemplateVariableMissing` + `TemplateVariableUnknown`

**What:** Extend the const object added in feature 047 with two new values.

**Where:** `apps/api/src/modules/engine/core/domain/lead-journey-error-reason.ts`.

**Done when:**
- Const object has the two new keys.
- Derived type stays consistent (declaration merging).
- Gate: `bun typecheck`.

**Tests:** none.
**Gate:** build.

---

### T3: Implement `TemplateVariableResolver` + unit tests

**What:** Pure mapper with closed-vocabulary lookup. Six unit tests at
minimum: each declared name resolves; empty/missing each throw; unknown
name throws.

**Where:**
- `apps/api/src/modules/engine/core/services/template-variable-resolver.ts`
- `apps/api/src/modules/engine/core/services/__test__/unit/template-variable-resolver.spec.ts`

**Reuses:** Domain types only. No DI.

**Done when:**
- `resolve(variables, { lead })` returns the Record on success.
- Each branch covered by a focused test.
- Gate: `bun test:unit`.

**Tests:** unit.
**Gate:** quick.
**Commit:** `feat(api): add TemplateVariableResolver`

---

### T4: Wire resolver into `JourneyDispatcher.sendStep` + extend `LockedJourney` with `leadName`

**What:** Dispatcher resolves variables before calling `plugin.send`; on
either exception, records failed touch + parks the journey with the
matching reason. `LeadJourneyRepository.lockById` projection adds
`leadName` so the resolver has the value.

**Where:**
- `apps/api/src/modules/engine/persistence/lead-journey.repository.ts`
- `apps/api/src/modules/engine/core/services/journey-dispatcher.ts`
- `apps/api/src/modules/engine/core/services/__test__/integration/journey-dispatcher.spec.ts` (extend if exists)

**Done when:**
- `LockedJourney` interface gains `leadName: string`.
- `sendStep` passes resolved variables in `SendPayload.template.variables`.
- Both exception paths record a `failed` touch and park the journey.
- Existing dispatcher tests still green.
- Gate: `bun test:integration && bun test:e2e`.

**Tests:** integration (existing dispatcher spec extended).
**Gate:** full.
**Commit:** `feat(api): resolve template variables in dispatcher.sendStep`

---

### T5: Map `variables` onto Meta HSM components in `MetaWhatsappPlugin.send` + unit tests

**What:** When `payload.template.variables` is present, build
`{ type: 'body', parameters: [{ type: 'text', text: <value> }, ...] }` and
include in the Meta POST body. Order from `Object.values(variables)`.

**Where:**
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts`
- `apps/api/src/modules/channel/plugins/meta-whatsapp/__test__/unit/meta-whatsapp.plugin.spec.ts`

**Done when:**
- Plugin's outbound POST body includes `components` only when there is at
  least one variable.
- Unit spec asserts the wire shape against a known input.
- Existing plugin tests still green.
- Gate: `bun test:unit`.

**Tests:** unit.
**Gate:** quick.
**Commit:** `feat(api): map template variables onto Meta HSM components`

---

### T6: Docs close-out — STATE, CONCERNS, ROADMAP, tasks

**Where:**
- `.specs/project/STATE.md` (lesson entry)
- `.specs/codebase/CONCERNS.md` (mark `template variables` sub-bullet resolved)
- `.specs/project/ROADMAP.md` (Phase 2.0 `048` → COMPLETE)
- `.specs/features/048-template-variable-resolution/tasks.md` (Status → Done)

**Tests:** none.
**Gate:** build (no code change).
**Commit:** `docs: close out 048`
