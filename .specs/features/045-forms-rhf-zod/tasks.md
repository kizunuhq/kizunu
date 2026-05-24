# 045 — Forms RHF + Zod — Tasks

**Design**: `.specs/features/045-forms-rhf-zod/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1 — Doctrine (parallel; rule + ADR before any code)

Five doc-edits land first so the migration is judged against accepted
doctrine. They're independent files → all `[P]`.

```
T1 [P] ADR-008
T2 [P] web-patterns.md §3 rewrite
T3 [P] web-patterns.md §10 checklist nudge
T4 [P] react.md §3 carve-out
T5 [P] docs/adr/README.md index
```

### Phase 2 — Doctrine cleanup (sequential, depends on Phase 1)

```
T6  delete LabeledInput
```

### Phase 3 — Contract lifts (RESOLVED before-the-fact)

**T7 and T8 are OBSOLETE.** Verification during Execute revealed both
contracts already exist:
- `CreateEntryTriggerRequestSchema` at
  `packages/api-contracts/src/engine/entry-trigger.contract.ts:3`
  (re-exported via `engine/index.ts`).
- `CreateTemplateRequestSchema` at
  `packages/api-contracts/src/cadence/template.contract.ts:3`
  (re-exported via `cadence/index.ts`).

The forms were declaring local `*FormValues` interfaces that duplicated the
existing schemas. T17/T18 simply import from `@kizunu/api-contracts/{engine,cadence}`
and delete the local interfaces — no new contract files needed.

```
T7 [DROPPED — contract already exists]
T8 [DROPPED — contract already exists]
```

### Phase 4 — Canonical example (sequential, depends on Phase 1)

```
T9  InviteMemberForm migration  ← sets the visual standard for the rest
```

### Phase 5 — Auth split (parallel after T9; each touches its own files)

```
T10 [P] LoginForm + routes/auth/login.tsx
T11 [P] SignupForm + routes/auth/signup.tsx
T12 [P] ForgotPasswordForm + routes/auth/forgot-password.tsx
T13 [P] ResetPasswordForm + routes/auth/reset-password.tsx  ← derived schema
```

### Phase 6 — Dialog form migrations (parallel after T9 + each task's contract)

```
T14 [P] ChannelAccountForm + spec update  ← derived schema (plugin-required)
T15 [P] GrantChannelAccessForm            ← derived schema (path-param lift)
T16 [P] ConnectorAccountForm              ← derived schema (JSON parse)
T17 [P] EntryTriggerForm                  ← contract already exists
T18 [P] TemplateForm                      ← contract already exists
```

### Phase 7 — Bookkeeping (sequential, last)

```
T19  ROADMAP.md entry for 045
T20  STATE.md lesson entry
```

---

## Task Breakdown

### T1: Create ADR-008 — Forms react-hook-form + zod

**What**: Author `docs/adr/008-forms-react-hook-form-zod.md` (Accepted)
capturing the four load-bearing calls.
**Where**: `docs/adr/008-forms-react-hook-form-zod.md` (new)
**Depends on**: None
**Reuses**: ADR-007 (`docs/adr/007-web-frontend-layering.md`) as the
formatting template; the existing `create-adr` skill format.
**Requirement**: FORM-01

**Tools**:
- MCP: NONE
- Skill: `create-adr` (optional — direct write is fine since ADR-007 is the
  template). If the skill is invoked, use the same headings as 007.

**Done when**:
- [ ] File exists with `# ADR-008: Forms use react-hook-form + zodResolver`
- [ ] Status: Accepted; Date: 2026-05-24
- [ ] Records four explicit calls: (1) RHF owns field state; (2) contract
  `*RequestSchema` is the validation source; (3) error surface split (field
  → `<FieldError id>` + a11y; server → top `<FormError>`); (4) forms are
  dumb (`{ id, defaultValues?, isPending, onSubmit, error? }`)
- [ ] References ADR-007 as the layering doctrine this ADR extends
- [ ] Lists references: `web-patterns.md` §3 (new recipes), `react.md` §3
  (carve-out), `code-standards.md` §10, `comments.md`

**Tests**: none
**Gate**: none (doc only)

**Verify**: `head -15 docs/adr/008-forms-react-hook-form-zod.md` shows the
title, date, status, deciders block matching ADR-007's shape.

---

### T2: Rewrite web-patterns.md §3 — form recipe

**What**: Replace the current §3 "Form recipe — smart page + dumb form"
content with three sub-sections: §3.a native-input recipe, §3.b
controlled-input (Controller) recipe, §3.c derived-`formSchema` recipe.
**Where**: `.agents/rules/web-patterns.md` (§3)
**Depends on**: None (independent doc edit; safer to do alongside T1)
**Reuses**: The existing §3 example structure (smart-page + dumb-form
split); the design.md canonical-code blocks.
**Requirement**: FORM-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] §3 opens with: "Forms own `useForm` bound to a contract schema. Per-field
  `useState` is forbidden in form components."
- [ ] §3.a shows the native-input recipe (register spread + aria-invalid +
  aria-describedby + `<FieldError id="<field>-error">`)
- [ ] §3.b shows the `<Controller>` recipe for `LookupSelect`/
  `PluginSelect`/dynamic credential fields, with `fieldState.error` and a
  matching `<FieldError>`
- [ ] §3.c shows the derived `formSchema = base.extend(...).superRefine(...)`
  pattern with a worked example (confirmPassword match cited)
- [ ] Smart-page section now points at the new `<Button form={id} type="submit">`
  pattern (already in the file); auth forms are noted as one of the smart-page
  consumers
- [ ] Old per-field `useState` example is removed entirely

**Tests**: none
**Gate**: none (doc only)

**Verify**: `grep -n "useState" .agents/rules/web-patterns.md` shows no
match in §3 (per-field state is forbidden, not exemplified).

---

### T3: Tighten web-patterns.md §10 — new-feature checklist

**What**: Update checklist item 8 to mention "`useForm` + `zodResolver(<contract schema>)`;
per-field `useState` is forbidden".
**Where**: `.agents/rules/web-patterns.md` (§10)
**Depends on**: None
**Reuses**: The existing §10 layout.
**Requirement**: FORM-03

**Tools**: NONE
**Done when**:
- [ ] Item 8 text reflects the new rule verbatim

**Tests**: none
**Gate**: none

**Verify**: `grep -A1 "create '-components/<feature>-form" .agents/rules/web-patterns.md`
shows the new addendum.

---

### T4: Spot-amend react.md §3

**What**: Add a one-sentence carve-out: form state lives in `react-hook-form`
per `web-patterns.md` §3; the "useState close to use" rule applies to
non-form ephemeral state.
**Where**: `.agents/rules/react.md` (§3)
**Depends on**: None
**Reuses**: Existing §3 prose.
**Requirement**: FORM-04

**Tools**: NONE
**Done when**:
- [ ] §3 closes with the carve-out sentence cited to `web-patterns.md` §3

**Tests**: none
**Gate**: none

**Verify**: `grep -A6 "Keep Component State Close" .agents/rules/react.md`
shows the new sentence.

---

### T5: Index ADR-008 in docs/adr/README.md

**What**: Add the ADR-008 line to `docs/adr/README.md` in chronological
order.
**Where**: `docs/adr/README.md`
**Depends on**: T1 (the ADR file must exist for the index to point at it)
**Reuses**: The existing index format.
**Requirement**: FORM-06

**Tools**: NONE
**Done when**:
- [ ] `docs/adr/README.md` lists ADR-008 with its title + status + date
- [ ] Listed after ADR-007 in the chronological order

**Tests**: none
**Gate**: none

**Verify**: `grep "008" docs/adr/README.md` shows the line.

---

### T6: Delete LabeledInput

**What**: Remove `apps/web/src/routes/auth/-components/labeled-input.tsx`
and verify no remaining import references after Phase 5 auth migration
completes.
**Where**: `apps/web/src/routes/auth/-components/labeled-input.tsx` (deleted)
**Depends on**: T1–T5 (rule + ADR landed before the file deletion); execution
defers to **after Phase 5** so the four auth forms have already stopped
importing it.
**Reuses**: n/a
**Requirement**: FORM-05

**Tools**: NONE
**Done when**:
- [ ] File deleted
- [ ] `grep -r 'LabeledInput' apps/web/src` returns nothing
- [ ] `bun check` is green (typecheck won't tolerate dangling imports)

**Tests**: none (the deleted file had none)
**Gate**: build — `bun check`

**Verify**: `bun check` exits 0.

---

### T7: Add CreateEntryTriggerRequestSchema contract [P]

**What**: Create `packages/api-contracts/src/connector/create-entry-trigger.contract.ts`
exporting `CreateEntryTriggerRequestSchema` + `CreateEntryTriggerRequest`
type. Add a re-export to the `connector/index.ts` barrel.
**Where**:
- `packages/api-contracts/src/connector/create-entry-trigger.contract.ts` (new)
- `packages/api-contracts/src/connector/index.ts` (modify — add re-export)
**Depends on**: None
**Reuses**: The exact schema shape from `entry-trigger-form.tsx:9-14` (the
local `EntryTriggerFormValues` interface) — promote it verbatim with zod v4
top-level formats per `.agents/rules/conventions.md` §1.
**Requirement**: FORM-07, FORM-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Schema exported with fields: `connectorAccountId: z.uuid()`,
  `cadenceId: z.uuid()`, `stageId: z.string().min(1).max(255)`,
  `pipelineId: z.uuid().nullable()`
- [ ] Inferred `CreateEntryTriggerRequest` type exported
- [ ] `connector/index.ts` re-exports both
- [ ] `bunx vp test --project web --run` passes (no regression)
- [ ] `bun scripts/check-zod-v4.ts` passes (top-level formats only)

**Tests**: none (the schema is consumed by T17; verification is via
typecheck + script gate)
**Gate**: quick — `bun typecheck && bun scripts/check-zod-v4.ts`

**Verify**: `cat packages/api-contracts/src/connector/index.ts | grep entry-trigger`
shows the new re-export line.

**Commit**: `feat(api-contracts): add CreateEntryTriggerRequestSchema (feature 045)`

---

### T8: Add CreateTemplateRequestSchema contract [P]

**What**: Create `packages/api-contracts/src/cadence/create-template.contract.ts`
exporting `CreateTemplateRequestSchema` + `CreateTemplateRequest`. Add
re-export to `cadence/index.ts`.
**Where**:
- `packages/api-contracts/src/cadence/create-template.contract.ts` (new)
- `packages/api-contracts/src/cadence/index.ts` (modify)
**Depends on**: None
**Reuses**: `TemplateFormValues` (template-form.tsx:7-13) as the source
shape.
**Requirement**: FORM-08, FORM-09

**Tools**: NONE
**Done when**:
- [ ] Schema exported with fields: `name: z.string().min(1).max(120)`,
  `channelPluginId: z.string().min(1).max(100)`,
  `providerTemplateName: z.string().min(1).max(255)`,
  `language: z.string().min(2).max(20)`,
  `variables: z.array(z.string()).default([])`
- [ ] Inferred `CreateTemplateRequest` type exported
- [ ] `cadence/index.ts` re-exports both
- [ ] `bun typecheck` passes
- [ ] `bun scripts/check-zod-v4.ts` passes

**Tests**: none
**Gate**: quick — `bun typecheck && bun scripts/check-zod-v4.ts`

**Verify**: `cat packages/api-contracts/src/cadence/index.ts | grep template`
shows the new re-export line.

**Commit**: `feat(api-contracts): add CreateTemplateRequestSchema (feature 045)`

---

### T9: Migrate InviteMemberForm to the new recipe

**What**: Rewrite `invite-member-form.tsx` using `useForm<InviteMemberRequest>` +
`zodResolver(InviteMemberRequestSchema)`. Replace per-field `useState`,
manual submit-validation, and the top-`<FormError>`-as-validation-surface
pattern with the recipe from §3.a. Keep the dumb-form prop contract
(`{ formId, isPending, error, onSubmit }` — rename `formId → id` per the
new recipe's contract, OR keep `formId` if it's the only call-site change.
Pick the form-prop rename in this task and propagate). The call-site
(`invite-member-dialog.tsx`) updates to match.
**Where**:
- `apps/web/src/routes/_app/settings/-components/members/invite-member-form.tsx`
- `apps/web/src/routes/_app/settings/-dialogs/invite-member-dialog.tsx` (rename prop)
**Depends on**: T1–T8 (Phase 1 doctrine + Phase 3 contracts complete; Phase 6
delete of LabeledInput is unrelated to this form)
**Reuses**: `InviteMemberRequestSchema`, `Field`/`FieldLabel`/`FieldError`,
`Input`, `FormError`, `getApiErrorMessage`.
**Requirement**: FORM-10, FORM-11, FORM-13, FORM-14, FORM-15

**Tools**:
- MCP: NONE
- Skill: NONE (form component is thin; no derived schema, no fat logic to test)

**Done when**:
- [ ] Form imports `useForm` from `react-hook-form` and `zodResolver` from
  `@hookform/resolvers/zod`
- [ ] No `useState` anywhere in the file
- [ ] `<Input>` receives `{...register('email')}` + `aria-invalid` +
  `aria-describedby`
- [ ] `<FieldError id="email-error">{errors.email?.message}</FieldError>`
  follows the input
- [ ] Top `<FormError>` shows ONLY the server-error string (no
  `validationError ?? error` merge)
- [ ] Form prop `id: string` (renamed from `formId` if §3.a prescribes;
  otherwise document why `formId` stays)
- [ ] `invite-member-dialog.tsx` passes the prop with the matching name
- [ ] File ≤50 lines (`react.md` §9)
- [ ] `bunx vp test --project web --run` passes (the existing test for this
  form, if any, still passes — verify by name)
- [ ] `bun check` exits 0

**Tests**: none (form is thin RHF wiring; the existing `channel-account-form.spec.tsx`
covers the cross-cutting pattern after T14)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — open the invite-member dialog, submit empty;
the email field shows `aria-invalid`, `<FieldError>` renders "Required" (or
the schema's message) inline; top banner empty. Submit valid email; success
toast fires.

**Commit**: `feat(web): migrate invite-member-form to react-hook-form + zod (feature 045)`

---

### T10: Migrate LoginForm + split routes/auth/login.tsx [P]

**What**: Convert `login-form.tsx` to a dumb form `{ id, isPending, error?, onSubmit }`
using `useForm<LoginRequest>` + `zodResolver(LoginRequestSchema)`. Move
`useLogin`, `useNavigate`, `PageHeader`, the sign-up link block, and the
submit button into `routes/auth/login.tsx` (the smart page). The form
renders only `<form>` + fields. `mapLoginError` is applied in the route
to produce the `error` prop string.
**Where**:
- `apps/web/src/routes/auth/-components/login-form.tsx` (rewrite as dumb form)
- `apps/web/src/routes/auth/login.tsx` (rewrite as smart page — owns mutation + navigation)
**Depends on**: T9 (canonical pattern established)
**Reuses**: `LoginRequestSchema`, `useLogin`, `mapLoginError`, `PageHeader`,
`Field*`, `Input`, `Button`, `FormError`.
**Requirement**: FORM-17, FORM-18, FORM-19

**Tools**: NONE
**Done when**:
- [ ] `login-form.tsx` has only the dumb form (no `useLogin`, no
  `useNavigate`, no `PageHeader`, no submit button rendered inside)
- [ ] `routes/auth/login.tsx` owns the mutation hook + navigation +
  `PageHeader` + the sign-up/forgot-password links + the submit button via
  `<Button form={id} type="submit">`
- [ ] Form file imports `useForm` + `zodResolver`; no `useState`
- [ ] Each `<Input>` has `register` spread + aria attrs + `<FieldError id>`
- [ ] Top `<FormError>` shows the `error` string from the parent (the
  parent calls `mapLoginError` on `useLogin`'s `error` to produce it)
- [ ] `LabeledInput` is NOT imported (replaced by Field+FieldLabel+Input direct)
- [ ] Form file ≤50 lines; route file ≤80 lines (React component limit is
  50 but the route file can hold the LoginFieldError sub-component if it
  still helps)
- [ ] `bun check` is green

**Tests**: none (thin RHF wiring; manual smoke walk covers it)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — `/auth/login`; submit blank → both fields show
field-level errors via `<FieldError>`; submit bad credentials → top banner
shows mapped error copy; submit valid → navigates to `/workspace`.

**Commit**: `feat(web): split login form into dumb form + smart page (feature 045)`

---

### T11: Migrate SignupForm + split routes/auth/signup.tsx [P]

**What**: Same shape as T10 for the signup flow.
**Where**:
- `apps/web/src/routes/auth/-components/signup-form.tsx`
- `apps/web/src/routes/auth/signup.tsx`
**Depends on**: T9
**Reuses**: `RegisterRequestSchema`, `useRegister`, `mapLoginError`,
`PageHeader`, `Field*`, `Input`, `Button`, `FormError`.
**Requirement**: FORM-17, FORM-18, FORM-19

**Tools**: NONE
**Done when**:
- [ ] Form file is a dumb form with three native inputs (name, email,
  password) using `register` + aria attrs + `<FieldError id>`
- [ ] Route file owns `useRegister`, navigates to `/workspace` on success,
  renders the "Already have an account?" link block, and the submit
  button
- [ ] No `LabeledInput` import
- [ ] File-size limits respected
- [ ] `bun check` green

**Tests**: none
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: `/auth/signup` — short password (< 8) shows field-level error;
duplicate email shows top banner; valid creates the workspace.

**Commit**: `feat(web): split signup form into dumb form + smart page (feature 045)`

---

### T12: Migrate ForgotPasswordForm + split routes/auth/forgot-password.tsx [P]

**What**: Same shape as T10. Preserve the `request.isSuccess` →
`<ForgotPasswordSuccess>` branch in the route (not the form).
**Where**:
- `apps/web/src/routes/auth/-components/forgot-password-form.tsx`
- `apps/web/src/routes/auth/forgot-password.tsx`
**Depends on**: T9
**Reuses**: `RequestPasswordResetSchema`, `useRequestPasswordReset`,
`PageHeader`, `Field*`, `Input`, `Button`, `FormError`. `ForgotPasswordSuccess`
sub-component moves into the route file (or stays alongside the form in
`-components/` if helpful).
**Requirement**: FORM-17, FORM-18, FORM-19, FORM-21

**Tools**: NONE
**Done when**:
- [ ] Form is a dumb form with one `<Input type="email">`
- [ ] Route owns the mutation + the success-state branch (`isSuccess` →
  `<ForgotPasswordSuccess>`)
- [ ] Field-level error fires for missing/malformed email; server error
  fires for the API-rejection path
- [ ] No `LabeledInput`
- [ ] `bun check` green

**Tests**: none
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: `/auth/forgot-password` — blank submit shows field-level
"Required"; valid submit shows the success screen.

**Commit**: `feat(web): split forgot-password form into dumb form + smart page (feature 045)`

---

### T13: Migrate ResetPasswordForm + split routes/auth/reset-password.tsx — derived schema

**What**: Same split as T10, plus a derived `formSchema`:
`ConfirmPasswordResetSchema.extend({ confirmPassword: z.string().min(MIN_PASSWORD_LENGTH) }).superRefine(({ password, confirmPassword }, ctx) => { ... })`.
The dumb form passes `{ password, confirmPassword }` through; the route
strips `confirmPassword` before calling `reset.resetPassword({ token,
password })`. Preserve `ResetPasswordSuccess` and `ResetPasswordInvalidLink`
branches in the route.
**Where**:
- `apps/web/src/routes/auth/-components/reset-password-form.tsx`
- `apps/web/src/routes/auth/reset-password.tsx`
**Depends on**: T9
**Reuses**: `ConfirmPasswordResetSchema`, `useResetPassword`,
`mapLoginError` (for non-token error mapping), `PageHeader`, `Field*`,
`Input`, `Button`, `FormError`.
**Requirement**: FORM-17, FORM-18, FORM-19, FORM-20, FORM-21

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (the derived schema is **fat** — it encodes the
  match rule. Invoke `generate-tests` to author a focused unit spec on the
  derived `formSchema` covering happy + mismatched-confirm + too-short.)

**Done when**:
- [ ] Form file imports/declares the derived `formSchema` (above the
  component) and uses `useForm<z.infer<typeof formSchema>>` +
  `zodResolver(formSchema)`
- [ ] Route owns the mutation + success + invalid-link branches
- [ ] Mismatched confirm shows `<FieldError id="confirmPassword-error">`
  inside the confirm-password field — not the top banner
- [ ] Short password shows `<FieldError id="password-error">` inside the
  password field
- [ ] Server error (other than `identity.invalid-reset-token`) surfaces via
  top `<FormError>`; the `identity.invalid-reset-token` branch still renders
  the `<ResetPasswordInvalidLink>` sub-page
- [ ] Derived-schema unit spec lives in
  `apps/web/src/routes/auth/-components/__test__/reset-password-schema.spec.ts`
  (or `routes/auth/__test__/reset-password-form.spec.tsx` if `generate-tests`
  prefers the form-level location) with: (a) valid pair passes;
  (b) `confirmPassword !== password` adds an issue at `path: ['confirmPassword']`;
  (c) `password.length < 8` adds an issue at `path: ['password']`
- [ ] `bunx vp test --project web --run` passes including the new spec
- [ ] `bun check` green

**Tests**: web unit (on the derived schema; fat logic per the matrix)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: `/auth/reset-password?token=invalid` → invalid-link page;
valid token + mismatched confirm → field error on the second input;
valid token + valid pair → success screen.

**Commit**: `feat(web): split reset-password form into dumb form + smart page (feature 045)`

---

### T14: Migrate ChannelAccountForm + derived schema + update spec [P]

**What**: Rewrite `channel-account-form.tsx` using
`useForm<CreateChannelAccountRequest>` + `zodResolver(formSchema)`, where
`formSchema = CreateChannelAccountRequestSchema.superRefine(({ pluginId,
credentials }, ctx) => { /* every required userInputField(pluginId) must
be filled */ })`. `<PluginSelect>` wraps in `<Controller name="pluginId">`;
each dynamic credential input wraps in `<Controller name={`credentials.${key}`}>`.
Update `channel-account-form.spec.tsx` so the empty-plugin assertion
looks for a per-field `<FieldError>`, not the top `<FormError>`.
**Where**:
- `apps/web/src/routes/_app/settings/-components/channels/channel-account-form.tsx`
- `apps/web/src/routes/_app/settings/-components/channels/__test__/channel-account-form.spec.tsx`
**Depends on**: T9
**Reuses**: `CreateChannelAccountRequestSchema`, `useChannelPlugins`,
`userInputFields`, `hasRequiredCredentials` (or replace its job with the
`.superRefine`), `PluginSelect`, `CredentialFieldsInput`, `Field*`,
`Input`, `FormError`. The `<Controller>` API from `react-hook-form`.
**Requirement**: FORM-10, FORM-11, FORM-12, FORM-13, FORM-22

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (the derived `.superRefine` is **fat** — author a
  focused spec on the schema covering missing pluginId, missing required
  credential, valid case)

**Done when**:
- [ ] `useForm<CreateChannelAccountRequest>` + `zodResolver(formSchema)`
- [ ] `PluginSelect` wrapped in `<Controller name="pluginId">` with
  `<FieldError id="pluginId-error">` rendered from `fieldState.error`
- [ ] Each dynamic credential field wrapped in its own `<Controller name={`credentials.${key}`}>`
  with matching `<FieldError>` per field
- [ ] No `useState` for `pluginId`, `name`, `credentials`, or
  `validationError`
- [ ] The plugin-change side-effect (clear credentials) implemented via
  RHF's `reset({ pluginId: next, credentials: {} })` in the Controller's
  `onChange` callback (verify this is the right RHF API — see Knowledge
  Verification §codebase first)
- [ ] Spec file updated: assertions for "submit with no plugin" assert
  `<FieldError>` inside the plugin Field, not the top banner; assertions
  for "submit with missing required credential" assert per-field errors
- [ ] New focused spec on the derived schema (3 cases above) exists
- [ ] `bunx vp test --project web --run` passes (375+ tests, no silent
  drops — verify by name count)
- [ ] `bun check` green

**Tests**: web unit (derived schema + updated form spec)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — open Add channel account dialog → submit
empty → "Required" appears next to the plugin select; pick plugin, leave
required credential blank → "Required" appears next to that field; fill
and submit → success.

**Commit**: `feat(web): migrate channel-account-form to react-hook-form + zod (feature 045)`

---

### T15: Migrate GrantChannelAccessForm + derived schema [P]

**What**: Rewrite `grant-channel-access-form.tsx` using a derived
`formSchema = GrantChannelAccessRequestSchema.extend({ accountId: z.uuid() })`
(the contract only carries `userId`; `accountId` is a path-param on the
mutation). Two `<Controller>`s for the two `<LookupSelect>`s. The smart
dialog wrapper destructures `{ accountId, userId }` from `onSubmit` and
calls the mutation with both (path + body).
**Where**:
- `apps/web/src/routes/_app/settings/-components/channels/grant-channel-access-form.tsx`
- `apps/web/src/routes/_app/settings/-dialogs/grant-channel-access-dialog.tsx` (the wrapper now strips/forwards)
**Depends on**: T9
**Reuses**: `GrantChannelAccessRequestSchema`, `useWorkspaceChannels`,
`useMembers`, `LookupSelect`, `Field*`, `FormError`, `<Controller>`.
**Requirement**: FORM-10, FORM-12, FORM-13

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (derived schema is **fat** — author a spec
  covering the missing `accountId` case + happy path)

**Done when**:
- [ ] Derived `formSchema` declared above the component
- [ ] Both `LookupSelect`s wrapped in `<Controller>`
- [ ] Field-level errors render per Select via `<FieldError id="accountId-error">`
  and `<FieldError id="userId-error">`
- [ ] No `useState` for `accountId`, `userId`, or `validationError`
- [ ] Dialog wrapper extracts `{ accountId, ...payload }` and forwards
  `accountId` to the path-bound mutation and `payload` as the body
- [ ] Derived-schema unit spec exists
- [ ] `bunx vp test --project web --run` passes
- [ ] `bun check` green

**Tests**: web unit (derived schema)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — Grant access dialog → submit empty → both
selects show inline errors; pick both → submit succeeds.

**Commit**: `feat(web): migrate grant-channel-access-form to react-hook-form + zod (feature 045)`

---

### T16: Migrate ConnectorAccountForm + derived JSON-credentials schema [P]

**What**: Rewrite `connector-account-form.tsx`. Add a derived
`formSchema = CreateConnectorAccountRequestSchema.extend({ credentialsRaw: z.string() })
  .superRefine(({ credentialsRaw }, ctx) => { const parsed = parseJsonObject(credentialsRaw);
  if (parsed === null) ctx.addIssue({ code: 'custom', path: ['credentialsRaw'], message: 'Invalid JSON.' }) })
  .transform(({ credentialsRaw, ...rest }) => ({ ...rest, credentials: parseJsonObject(credentialsRaw)! }))`.
The `<Textarea>` registers under `credentialsRaw`. The `<LookupSelect>` for
`connectorId` wraps in `<Controller>`. The dialog wrapper receives the
transformed payload with `credentials` already a parsed object.
**Where**:
- `apps/web/src/routes/_app/settings/-components/connectors/connector-account-form.tsx`
**Depends on**: T9
**Reuses**: `CreateConnectorAccountRequestSchema`, `parseJsonObject`,
`LookupSelect`, `Textarea`, `Field*`, `FormError`, `<Controller>`.
**Requirement**: FORM-10, FORM-12, FORM-13

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (derived schema with transform is **fat** —
  author a spec: valid JSON object passes and transforms; non-object JSON
  rejects; malformed JSON rejects; happy path produces the expected typed
  output)

**Done when**:
- [ ] Derived `formSchema` with `.superRefine` + `.transform` declared
- [ ] `<Textarea>` registered to `credentialsRaw`
- [ ] `<LookupSelect>` for `connectorId` wrapped in `<Controller>`
- [ ] No `useState` for any field
- [ ] Field-level errors render per field
- [ ] `onSubmit` receives `{ connectorId, name, credentials }` (transformed)
- [ ] Derived-schema unit spec covers the three cases above
- [ ] `bunx vp test --project web --run` passes
- [ ] `bun check` green

**Tests**: web unit (derived schema + transform)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — submit `{}` → success; submit `not-json` →
"Invalid JSON" inline error near the textarea.

**Commit**: `feat(web): migrate connector-account-form to react-hook-form + zod (feature 045)`

---

### T17: Migrate EntryTriggerForm [P]

**What**: Rewrite `entry-trigger-form.tsx` using
`useForm<CreateEntryTriggerRequest>` + `zodResolver(CreateEntryTriggerRequestSchema)`.
Two `<Controller>`s for the two `<LookupSelect>`s; one `register` spread on
the `<Input>` for `stageId`. Drop the local `EntryTriggerFormValues`
interface.
**Where**:
- `apps/web/src/routes/_app/settings/-components/connectors/entry-trigger-form.tsx`
**Depends on**: T7 (contract must exist), T9
**Reuses**: `CreateEntryTriggerRequestSchema`, `useWorkspaceConnectors`,
`useCadences`, `LookupSelect`, `Input`, `Field*`, `FormError`, `<Controller>`.
**Requirement**: FORM-10, FORM-11, FORM-12, FORM-13

**Tools**: NONE
**Done when**:
- [ ] Local `EntryTriggerFormValues` interface removed; `CreateEntryTriggerRequest`
  used everywhere
- [ ] Two `<Controller>`s + one register-spread `<Input>`
- [ ] Field-level errors render
- [ ] No `useState`
- [ ] Dialog wrapper (`create-entry-trigger-dialog.tsx`) passes the
  payload through to the mutation unchanged (it already does)
- [ ] `bun check` green

**Tests**: none (no derived schema; pure RHF + contract)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — submit empty → 3 inline errors; fill all →
success.

**Commit**: `feat(web): migrate entry-trigger-form to react-hook-form + zod (feature 045)`

---

### T18: Migrate TemplateForm [P]

**What**: Rewrite `template-form.tsx` using `useForm<CreateTemplateRequest>` +
`zodResolver(CreateTemplateRequestSchema)`. `<PluginSelect>` wraps in
`<Controller>`. Three `<Input>`s register-spread. Drop the local
`TemplateFormValues` interface.
**Where**:
- `apps/web/src/routes/_app/workspace/-components/cadences/template-form.tsx`
**Depends on**: T8 (contract must exist), T9
**Reuses**: `CreateTemplateRequestSchema`, `PluginSelect`, `Input`,
`Field*`, `FormError`, `<Controller>`.
**Requirement**: FORM-10, FORM-11, FORM-12, FORM-13

**Tools**: NONE
**Done when**:
- [ ] Local `TemplateFormValues` interface removed
- [ ] `<Controller>` for `channelPluginId`; three `register` spreads for
  the inputs
- [ ] No `useState`
- [ ] Field-level errors render
- [ ] `bun check` green

**Tests**: none (no derived schema)
**Gate**: quick — `bunx vp test --project web --run`

**Verify**: Manual Chrome — New template dialog → submit empty → 4 inline
errors; fill all → success.

**Commit**: `feat(web): migrate template-form to react-hook-form + zod (feature 045)`

---

### T19: ROADMAP.md — add feature 045 entry

**What**: Add a `**Forms RHF + Zod doctrine + sweep** - COMPLETE` entry
under Phase 1.9 in `.specs/project/ROADMAP.md`, mirroring the format of
041/042/043/044.
**Where**: `.specs/project/ROADMAP.md` (Phase 1.9 section)
**Depends on**: T6, T9–T18 (all implementation tasks complete and verified)
**Reuses**: The existing Phase 1.9 entries as the format template.
**Requirement**: FORM-23

**Tools**: NONE
**Done when**:
- [ ] New Phase 1.9 entry exists with: title, COMPLETE marker, one-paragraph
  summary referencing ADR-008 + `web-patterns.md` §3 rewrite + the 10
  migrated forms + the auth split + the two lifted contracts +
  `LabeledInput` deletion
- [ ] No other roadmap sections changed

**Tests**: none
**Gate**: none

**Verify**: `grep -A2 "Forms RHF + Zod" .specs/project/ROADMAP.md` shows
the entry.

---

### T20: STATE.md — add the doctrine lesson

**What**: Append a single bullet under "## Lessons" capturing the load-bearing
calls and pointing at ADR-008 + the rule edits + the per-form mapping. Also
update the existing `web-patterns-doctrine.md` memory entry (or add a new
memory) noting feature 045 closed the form-recipe gap.
**Where**:
- `.specs/project/STATE.md`
- `/Users/nothing/.claude/projects/-Users-nothing-Workspaces-kizunu/memory/web-patterns-doctrine.md`
  (update — see memory rule about preferring updates over duplicates)
- `/Users/nothing/.claude/projects/-Users-nothing-Workspaces-kizunu/memory/MEMORY.md`
  (one-line addition or hook update on the existing entry)
**Depends on**: T19 (ROADMAP first, then memory)
**Reuses**: The existing STATE.md lesson format; the existing memory entry
for the web-patterns doctrine.
**Requirement**: FORM-24

**Tools**: NONE
**Done when**:
- [ ] STATE.md "Lessons" carries one new bullet summarizing what feature
  045 delivered (one paragraph, same density as the 044 entry)
- [ ] `web-patterns-doctrine.md` memory updated (or a new memory linked
  via `[[name]]`) to record that the form pattern is now RHF + zodResolver
- [ ] `MEMORY.md` index reflects the update (hook line if changed)

**Tests**: none
**Gate**: none

**Verify**: `grep -c "045" .specs/project/STATE.md` shows ≥1 match in the
new lesson.

---

## Parallel Execution Map

```
Phase 1 (doctrine, parallel):
  T1 [P] T2 [P] T3 [P] T4 [P] T5 [P]  ── all independent doc edits

Phase 2 (cleanup, sequential after Phase 1 + Phase 5):
  T6  (deletion deferred until auth migration drops every LabeledInput import)

Phase 3 (contracts, parallel; can run alongside Phase 1):
  T7 [P]  T8 [P]

Phase 4 (canonical, sequential after Phases 1+3):
  T9

Phase 5 (auth split, parallel after T9):
  T10 [P]  T11 [P]  T12 [P]  T13 [P]

Phase 6 (dialog form sweep, parallel after T9 + contract deps):
  T14 [P]  T15 [P]  T16 [P]  T17 [P] (needs T7)  T18 [P] (needs T8)

Phase 2 (cleanup, sequential after Phase 5):
  T6  delete LabeledInput

Phase 7 (bookkeeping, sequential, last):
  T19 → T20
```

**Parallelism constraint:** web tests are parallel-safe (jsdom per worker,
`cleanup` after each test — TESTING.md §Parallelism Assessment). Every
`[P]` task in Phase 5 / Phase 6 touches its own files and adds tests to its
own `__test__/` location. No shared mutable state.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 new doc file (ADR) | ✅ Granular |
| T2 | 1 file (rule §3 rewrite — cohesive single section) | ✅ Granular |
| T3 | 1 file (rule §10 nudge) | ✅ Granular |
| T4 | 1 file (rule §3 carve-out) | ✅ Granular |
| T5 | 1 file (ADR index) | ✅ Granular |
| T6 | 1 file deletion | ✅ Granular |
| T7 | 1 new contract + 1 barrel re-export line | ✅ Granular (2 files, 1 concept) |
| T8 | 1 new contract + 1 barrel re-export line | ✅ Granular |
| T9 | 1 form file + 1 dialog wrapper prop update (cohesive change) | ✅ Granular |
| T10 | 1 form + 1 route file (form-page split is one concept) | ✅ Granular |
| T11 | 1 form + 1 route | ✅ Granular |
| T12 | 1 form + 1 route | ✅ Granular |
| T13 | 1 form + 1 route + 1 unit spec (one feature: split + derived schema) | ✅ Granular |
| T14 | 1 form + 1 spec update + 1 new schema spec | ✅ Granular |
| T15 | 1 form + 1 dialog tweak + 1 schema spec | ✅ Granular |
| T16 | 1 form + 1 schema spec | ✅ Granular |
| T17 | 1 form (contract done in T7) | ✅ Granular |
| T18 | 1 form (contract done in T8) | ✅ Granular |
| T19 | 1 file (roadmap) | ✅ Granular |
| T20 | 1 lesson + 1 memory update | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | none | ✅ Match |
| T2 | None | none | ✅ Match |
| T3 | None | none | ✅ Match |
| T4 | None | none | ✅ Match |
| T5 | T1 | T1 (via Phase 1 + ADR-008 referenced before index) | ✅ Match |
| T6 | T1–T5, **after Phase 5** | "Phase 2 (cleanup) after Phase 5" | ✅ Match |
| T7 | None | none (Phase 3 has no in-deps) | ✅ Match |
| T8 | None | none | ✅ Match |
| T9 | T1–T8 | "Phase 4 after Phases 1+3" | ✅ Match |
| T10 | T9 | "Phase 5 after T9" | ✅ Match |
| T11 | T9 | "Phase 5 after T9" | ✅ Match |
| T12 | T9 | "Phase 5 after T9" | ✅ Match |
| T13 | T9 | "Phase 5 after T9" | ✅ Match |
| T14 | T9 | "Phase 6 after T9" | ✅ Match |
| T15 | T9 | "Phase 6 after T9" | ✅ Match |
| T16 | T9 | "Phase 6 after T9" | ✅ Match |
| T17 | T7, T9 | "Phase 6, needs T7" | ✅ Match |
| T18 | T8, T9 | "Phase 6, needs T8" | ✅ Match |
| T19 | T6, T9–T18 | "Phase 7 after all implementation" | ✅ Match |
| T20 | T19 | "Phase 7, after T19" | ✅ Match |

All match — no drift.

---

## Test Co-location Validation

| Task | Code layer modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | doc (ADR) | none | none | ✅ |
| T2–T5 | doc (rule + index) | none | none | ✅ |
| T6 | code removal (no schema/use-case) | none | none | ✅ |
| T7 | shared package (zod schema; consumed by T17 form, not a fat layer on its own) | none (it's a contract, not a business rule) | none | ✅ |
| T8 | shared package (zod schema) | none | none | ✅ |
| T9 | Web component (thin RHF wiring; no fat logic added) | none (browser e2e covers it) | none | ✅ |
| T10 | Web component (thin) + Web route (thin) | none | none | ✅ |
| T11 | thin web | none | none | ✅ |
| T12 | thin web | none | none | ✅ |
| T13 | thin web + **fat derived schema** (.superRefine for match + min-length) | web unit (fat web logic) | web unit | ✅ |
| T14 | thin web + **fat derived schema** (.superRefine for plugin-required credentials) + update existing spec | web unit | web unit | ✅ |
| T15 | thin web + **fat derived schema** (.extend({ accountId }) lifts the path-param into RHF) — actually the derived schema is mostly an `.extend`, the `.uuid()` rule on the new field is the fat piece worth testing | web unit | web unit | ✅ |
| T16 | thin web + **fat derived schema** (.superRefine + .transform for JSON parse) | web unit | web unit | ✅ |
| T17 | thin web | none | none | ✅ |
| T18 | thin web | none | none | ✅ |
| T19 | doc (roadmap) | none | none | ✅ |
| T20 | doc (state + memory) | none | none | ✅ |

All test annotations match the coverage matrix. No `Tests: none` is being
used to defer fat-logic coverage.

---

## Tooling note

- `generate-tests` is invoked **inside** T13, T14, T15, T16 to author the
  schema specs (per the codebase preference: "all test implementation
  routes through `generate-tests`"). The skill classifies the derived
  schema as fat and authors a focused unit spec.
- `create-adr` is optional for T1 — ADR-007 is a complete template and
  this ADR fits the same format.
- `thermo-nuclear-code-quality-review` runs **after** Phase 7 per the
  AGENTS.md flow (not a task; a post-Execute gate).
- `review-and-ship` runs after the quality review, opens/updates the PR.
- `ci-watcher` / `fix-ci` run after push.
- `bun check` is the per-phase gate; final pass before `review-and-ship`.

---

## Commit cadence

One conventional commit per task (Phases 3–6) per AGENTS.md §"Branches and
commits". Phase 1 doc edits may collapse into a single
`docs: codify form recipe — ADR-008 + web-patterns.md §3 (feature 045)`
commit when no behavior change is implied — pragmatic call at commit time.
Phase 7 bookkeeping fits one commit: `docs: roadmap + state for feature 045`.

Expected branch shape: ~12 commits, all conventional, commitlint clean.
