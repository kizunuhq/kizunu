# 049 — Cadence Sending Window Tasks

**Spec:** `.specs/features/049-cadence-sending-window/spec.md`
**Design:** `.specs/features/049-cadence-sending-window/design.md`
**Status:** Done (T1–T5 + T6 docs; web preset chooser deferred to a follow-up,
matching the 047 web-UI deferral)

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6
```

Linear: domain primitives + schema, then contract, then repo, then
dispatcher, then e2e, then docs.

---

### T1: Add `SendingWindow` domain + `slideToWindow` + `isWithinWindow` + unit tests

**Where:**
- `apps/api/src/modules/cadence/core/domain/sending-window.ts`
- `apps/api/src/modules/cadence/core/domain/sending-window-slide.ts`
- `apps/api/src/modules/cadence/core/domain/__test__/unit/sending-window-slide.spec.ts`

**Done when:**
- Pure functions; no DI; native `Intl.DateTimeFormat`.
- Branches covered: inside-window, today-allowed-before-start, today-allowed-after-end, day-not-allowed, cross-week slide, DST-day documented.
- Gate: `bun test:unit`.

**Tests:** unit.
**Gate:** quick.

---

### T2: Schema + migration — `cadences.sending_window jsonb` nullable

**Where:**
- `apps/api/src/db/schemas/cadences.ts` (modify)
- generated migration

**Done when:**
- Column added; nullable; jsonb $type bound to SendingWindow.
- `bun db:generate` produces migration 0011.
- `bun scripts/drizzle-checksums.ts verify` passes.
- Gate: `bun typecheck`.

**Tests:** none.
**Gate:** build.

---

### T3: Contract — `SendingWindowSchema` in `@kizunu/api-contracts/cadence`

**Where:**
- `packages/api-contracts/src/cadence/cadence.contract.ts` (or new
  `sending-window.contract.ts`)

**Done when:**
- `SendingWindowSchema` validates timezone (Intl `try/catch`), days (1..7 ints 0..6), startMinute < endMinute.
- `CreateCadenceRequestSchema` + `UpdateCadenceRequestSchema` accept optional `sendingWindow`.
- 422 error code `cadence.invalid-sending-window` declared on the cadence error type union.
- Gate: `bun typecheck` + `bun scripts/check-zod-v4.ts`.

**Tests:** none (declarative).
**Gate:** build.

---

### T4: CadenceRepository read/write `sendingWindow` + use-case wiring + unit/integration tests

**Where:**
- `apps/api/src/modules/cadence/persistence/cadence.repository.ts` (project the field; persist on create/update)
- `apps/api/src/modules/cadence/core/use-cases/*` (pass through)
- `apps/api/src/modules/cadence/core/errors/cadence.errors.ts` (new `InvalidSendingWindowException` if needed; zod likely covers it)
- `apps/api/src/modules/cadence/core/use-cases/__test__/unit/create-cadence.use-case.spec.ts` (if exists, extend)

**Done when:**
- Cadence rows persist `sendingWindow` round-trip.
- `getWithSteps` projection returns it.
- Existing cadence integration spec still green.
- Gate: full.

**Tests:** integration (existing cadence repo spec extended).
**Gate:** full.

---

### T5: Dispatcher honors the window + integration test

**Where:**
- `apps/api/src/modules/engine/core/services/journey-dispatcher.ts`
- `apps/api/src/modules/engine/core/services/__test__/integration/journey-dispatcher.spec.ts` (extend)

**Done when:**
- `dispatchOne` slides `nextTouchAt` forward when outside the window; journey stays `running`; no touch attempt recorded.
- Existing tests still pass.
- New test: a journey whose `nextTouchAt` is 03:00 in `America/Sao_Paulo` and cadence window is `09:00-18:00` weekdays slides forward; the next dispatch tick at 09:01 sends as normal.
- Gate: full.

**Tests:** integration.
**Gate:** full.

---

### T6: Web admin preset chooser (P2) + docs close-out

**Where:**
- `apps/web/src/routes/_app/workspace/cadences/-components/cadence-form.tsx` (add a `SendingWindowSelect` field bound by `<Controller>`; preset chooser with three options)
- `apps/web/src/routes/_app/workspace/cadences/-utils/sending-window-presets.ts`
- `.specs/project/STATE.md` lesson
- `.specs/codebase/CONCERNS.md` `_(Resolved — sendingWindow)_` note
- `.specs/project/ROADMAP.md` Phase 2.0 `049` → COMPLETE
- `.specs/features/049-cadence-sending-window/tasks.md` Status → Done

**Done when:**
- Form chooser ships with three presets ("Always on", "Business hours",
  "Weekdays only"); transform builds the `sendingWindow` shape.
- `bun check` green.
- Gate: full.

**Tests:** web (form schema unit) if it carries logic.
**Gate:** full.
