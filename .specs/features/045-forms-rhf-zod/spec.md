# 045 — Forms: react-hook-form + zodResolver from contract schemas

## Problem Statement

Every form in `apps/web` reinvents field state with per-field `useState`, manual
`event.preventDefault()` + branching validation, and a single top-of-form
`<FormError>` banner that conflates UI-validation errors with server errors.
Validation rules either duplicate the contract schema (native `required`,
hand-rolled `pickInlineError`, `setValidationError`) or skip it entirely
(`InviteMemberForm` only enforces `required`); none surface field-level
`aria-invalid` / `aria-describedby` or per-field error copy. Two forms also
own schemas locally instead of through `@kizunu/api-contracts`
(`EntryTriggerFormValues`, `TemplateFormValues`). The web app already has
`react-hook-form@^7.72.0` + `@hookform/resolvers@^5.2.2` installed, and the
`FieldError` primitive already accepts an `errors[]` array — the plumbing is
sitting unused.

## Goals

- [ ] One form recipe across all 10 `apps/web` forms: `useForm` +
  `zodResolver(<contract schema>)`, field-level error rendering, dumb-form
  contract — matches the reference spice-target `login-form.tsx` exactly.
- [ ] Doctrine codified: ADR-008 records the four load-bearing calls;
  `.agents/rules/web-patterns.md` §3 carries the recipes future PRs are
  judged against; `react.md` §3 carves out form state.
- [ ] No transition clause — every existing form ships on the new pattern in
  this branch. Future forms have one obvious path.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Backend zod schema changes (apps/api or contracts that already match the API DTO shape) | Contracts stay the source of truth for the API DTO; UI-only rules live as derived schemas next to the form (decision §3). |
| New `useZodForm` wrapper helper | Decision §4 — use `useForm + zodResolver` directly per form file (matches the reference). |
| react-hook-form devtools / FormProvider patterns | Not used in any current form; add only when a multi-page wizard appears. |
| Edit-mode dialogs that don't exist yet (`useUpdateCadence`, `useUpdateTemplate`, `useRevokeChannelAccess` UIs) | Held in feature 044 out-of-scope; their forms will follow the new recipe when they're built. |
| Backend-rendered form patterns (none in this codebase) | n/a — apps/web is the only consumer of form primitives. |
| Migrating the `CadenceBuilder` (`apps/web/src/routes/_app/workspace/-components/cadences/cadence-builder.tsx`) to RHF | Not a `*-form.tsx` file; it composes lower-level Selects/Inputs but the orchestration is step-array editing, not a single submit. Stays as-is; revisit only if it grows a single zod-validatable schema. |

---

## User Stories

### P1: Doctrine lands before the sweep ⭐ MVP

**User Story**: As a Kizunu contributor, I want one written, ADR-accepted form
recipe so the next form I write has one obvious path and reviewers have one
standard to compare against.

**Why P1**: The migration is judged against the rule. Without ADR-008 + the
§3 rewrite, the sweep is just code reshuffling; with them, it's enforced
doctrine.

**Acceptance Criteria**:

1. WHEN a contributor opens `docs/adr/008-forms-react-hook-form-zod.md`
   THEN the document SHALL be Accepted, list four explicit calls
   (RHF owns field state; contract `*RequestSchema` is the validation source;
   field-level errors via `<FieldError id>` + `aria-invalid` / `aria-describedby`;
   forms are dumb), and link back to ADR-007.
2. WHEN a contributor reads `.agents/rules/web-patterns.md` §3
   THEN the section SHALL contain (a) the native-input recipe with `register`
   spread + `aria-invalid` + `aria-describedby` + `<FieldError id>`,
   (b) the controlled-input recipe with `<Controller>` for `LookupSelect` /
   `PluginSelect` / dynamic credential fields, (c) the derived-schema recipe
   for UI-only rules (`baseSchema.extend(...).superRefine(...)`), and (d) an
   explicit statement that per-field `useState` is forbidden in form
   components.
3. WHEN a contributor reads `.agents/rules/web-patterns.md` §10
   THEN checklist item 8 SHALL state "`useForm` + `zodResolver(<contract schema>)`;
   per-field `useState` is forbidden".
4. WHEN a contributor reads `.agents/rules/react.md` §3
   THEN the section SHALL carry a one-sentence carve-out pointing at
   `web-patterns.md` §3 for form state.
5. WHEN the rule lands THEN `apps/web/src/routes/auth/-components/labeled-input.tsx`
   SHALL no longer exist (replaced by direct Field + FieldLabel + Input
   composition).
6. WHEN `docs/adr/README.md` is opened THEN it SHALL list ADR-008 in its
   index.

**Independent Test**: open the four files; each criterion above is verified
by reading the file once. No code execution needed.

---

### P1: EntryTrigger/Template forms consume the existing contracts ⭐ MVP

**User Story**: As a Kizunu contributor, I want `EntryTrigger` and `Template`
forms to validate against contract schemas like every other form, so the
"contract is the source of truth" rule applies uniformly.

**Why P1**: The new rule forbids form-local schemas. The two forms currently
declare local `*FormValues` interfaces that duplicate already-existing
contract schemas — the migration ties them back to the contracts that
already exist.

**Pre-condition (verified at Tasks time)**: Both contracts already live in
`@kizunu/api-contracts` —
`CreateEntryTriggerRequestSchema` at
`packages/api-contracts/src/engine/entry-trigger.contract.ts:3` and
`CreateTemplateRequestSchema` at
`packages/api-contracts/src/cadence/template.contract.ts:3`. Each is already
re-exported through its bounded-context barrel. **No new contract file is
needed.** The task plan dropped T7/T8 once this was confirmed.

**Acceptance Criteria**:

1. WHEN `entry-trigger-form.tsx` is opened THEN it SHALL import
   `CreateEntryTriggerRequestSchema` + `CreateEntryTriggerRequest` from
   `@kizunu/api-contracts/engine` and SHALL NOT declare a local
   `EntryTriggerFormValues` interface.
2. WHEN `template-form.tsx` is opened THEN it SHALL import
   `CreateTemplateRequestSchema` + `CreateTemplateRequest` from
   `@kizunu/api-contracts/cadence` and SHALL NOT declare a local
   `TemplateFormValues` interface.
3. WHEN `bun check` runs THEN typecheck SHALL pass — the inferred contract
   types are assignment-compatible with the existing mutation hooks.

**Independent Test**: `bun check` passes; `grep "FormValues" apps/web/src/routes/_app/{settings,workspace}/-components/{connectors,cadences}` returns nothing.

---

### P1: 10 forms migrated to the new recipe ⭐ MVP

**User Story**: As an end-user, I want field-level error messages that point
at the exact field I got wrong (not a top-of-form banner that says "Pick a
plugin to continue"), and as a screen-reader user, I want `aria-invalid` and
`aria-describedby` to wire each field to its error so I'm not lost.

**Why P1**: The visible UX win — users see the right error in the right
place. The migration mechanically delivers it because RHF + zodResolver
produces per-field errors by construction.

**Acceptance Criteria**:

1. WHEN every form file under `apps/web/src/routes/**/*-form.tsx` is opened
   THEN it SHALL import `useForm` from `react-hook-form` and `zodResolver`
   from `@hookform/resolvers/zod`, and SHALL NOT call `useState` for any
   field value.
2. WHEN a form uses a native `<Input>` or `<Textarea>` THEN the call SHALL
   spread `{...register('<field>')}` and SHALL carry
   `aria-invalid={!!errors.<field>}` plus
   `aria-describedby={errors.<field> ? '<field>-error' : undefined}`.
3. WHEN a form uses a controlled component (`LookupSelect`, `PluginSelect`,
   `CredentialFieldsInput`) THEN the call SHALL be wrapped in
   `<Controller name="…" control={control} render={…}>` with the field's
   `<FieldError id="<field>-error">{errors.<field>?.message}</FieldError>`
   following the field.
4. WHEN a user submits an invalid form THEN every field with an error SHALL
   display the field-level message via `<FieldError id="<field>-error">`
   inside its `<Field>`, AND the top-of-form `<FormError>` SHALL stay empty
   (it is reserved for server errors).
5. WHEN a server error returns from a mutation THEN the dialog wrapper
   (`useMutationDialog`) SHALL surface it via the top-of-form `<FormError>`
   exactly as today, with no per-field error duplication.
6. WHEN a form submits valid data THEN the dumb-form's `onSubmit`
   SHALL receive a typed payload (`z.infer<typeof <Schema>>`) and the parent
   (route or dialog wrapper) SHALL be the only owner of mutation, navigation,
   and toast.
7. WHEN a dialog with an `<Input>` is opened, the autofocus SHALL match the
   reference: the first input is focused if `autoFocus` is set, else default
   browser order. (Forms don't add `autoFocus` blindly.)
8. WHEN `bun check` runs THEN typecheck + lint + format + the four
   `check-*.ts` scripts + every test SHALL pass.

**Independent Test**: for each of the 10 forms, exercise the manual flow
described in the per-form table in the design phase — submit empty, submit
malformed, submit valid; observe field-level error rendering, screen-reader
attributes, and the top-of-form banner is empty unless the API returned an
error.

---

### P1: Auth forms split into smart-page + dumb-form ⭐ MVP

**User Story**: As a Kizunu contributor, I want one shape across every form
in the app — auth and dialog forms alike — so I don't have to remember "auth
forms own their own mutation hook" as an exception.

**Why P1**: The reference pattern is dumb-form-only. The four auth forms
today own their own mutation hook + navigation + `PageHeader`, which is the
opposite of the dumb-form contract. Splitting them removes the "auth is
special" footnote.

**Acceptance Criteria**:

1. WHEN the four auth form components
   (`apps/web/src/routes/auth/-components/{login,signup,forgot-password,reset-password}-form.tsx`)
   are opened THEN each SHALL be a dumb form: props
   `{ id, defaultValues?, isPending, onSubmit, error? }` (plus form-specific
   props like `token` for reset-password), no mutation hooks, no
   `useNavigate`, no `PageHeader`.
2. WHEN the four auth routes
   (`apps/web/src/routes/auth/login.tsx`, `signup.tsx`,
   `forgot-password.tsx`, `reset-password.tsx`) are opened THEN each SHALL be
   the smart page: owns the mutation hook (`useLogin`, `useRegister`,
   `useRequestPasswordReset`, `useResetPassword`), renders `PageHeader`,
   navigates on success, surfaces server errors via `<FormError>` or a
   per-feature copy block (e.g. `mapLoginError`), and renders the submit
   button outside the form via `form={formId}`.
3. WHEN the user submits an auth form with an empty / malformed email THEN
   the form SHALL render the field-level error from
   `LoginRequestSchema`/`RegisterRequestSchema`/etc. via `<FieldError>`, NOT
   navigate, NOT call the mutation.
4. WHEN the password mismatch rule on reset-password fires THEN it SHALL
   come from a derived `formSchema = ConfirmPasswordResetSchema.extend({
   confirmPassword: z.string().min(8) }).superRefine(({ password,
   confirmPassword }, ctx) => ...)` that lives in the form file — not in the
   contract (decision §3).
5. WHEN the success/error sub-components for forgot-password and
   reset-password (`ForgotPasswordSuccess`, `ResetPasswordSuccess`,
   `ResetPasswordInvalidLink`) are inspected THEN they SHALL still exist
   either in the route file (preferred) or alongside the form, displaying
   the same copy as today.

**Independent Test**: walk the auth flow in Chrome (login → invalid email,
signup → short password, forgot-password → success state, reset-password →
mismatched confirm, reset-password → invalid token); observe field-level
errors, server-error banner, and that the route file owns navigation.

---

## Edge Cases

- WHEN a form's contract schema doesn't carry a field the UI needs (e.g.
  `GrantChannelAccessRequestSchema` only carries `userId` because
  `accountId` is a path param) THEN the form SHALL declare a derived
  `formSchema = base.extend({ accountId: z.uuid() })` next to it, and the
  smart wrapper SHALL destructure `{ accountId, ...payload }` before calling
  the mutation.
- WHEN a form needs a UI-only cross-field rule (confirmPassword match,
  JSON-object credentials, plugin-specific required credentials) THEN the
  rule SHALL live in a derived `formSchema` in the form file via
  `.superRefine(...)` or `.refine(...)`, not in `@kizunu/api-contracts`.
- WHEN a form has a dynamic field set (`channel-account-form.tsx`'s
  `CredentialFieldsInput`) THEN each generated input SHALL be wrapped in its
  own `<Controller name={`credentials.${key}`} ...>` (RHF supports nested
  paths via dot notation), and the plugin-specific required rule SHALL fold
  into the derived schema's `.superRefine(...)` keyed on `pluginId`.
- WHEN a form has `defaultValues` (future edit dialogs) THEN they SHALL be
  passed to `useForm({ defaultValues })`, not initialized via per-field
  `useState`.
- WHEN a form's submit is in flight (`isPending=true`) THEN every field
  SHALL be `disabled={isPending}` (parent decides), AND RHF SHALL block a
  second submit via `handleSubmit` (default behavior — no manual guard
  needed).
- WHEN a controlled component (`LookupSelect`) receives an empty string from
  RHF on mount (because `defaultValues` is omitted) THEN it SHALL render its
  placeholder and the field-level error SHALL not fire until the user
  attempts submit.
- WHEN the contract schema validates but the API still rejects (e.g.
  duplicate name, expired token) THEN the server error SHALL surface in the
  top-of-form `<FormError>`, NOT in a per-field `<FieldError>` — the two
  surfaces are deliberately separate (decision §1, error surface split).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FORM-01 | P1: Doctrine lands | Design | Pending |
| FORM-02 | P1: Doctrine lands (web-patterns.md §3 rewrite) | Design | Pending |
| FORM-03 | P1: Doctrine lands (web-patterns.md §10 checklist) | Design | Pending |
| FORM-04 | P1: Doctrine lands (react.md §3 carve-out) | Design | Pending |
| FORM-05 | P1: Doctrine lands (delete LabeledInput) | Tasks | Pending |
| FORM-06 | P1: Doctrine lands (ADR-008 indexed) | Tasks | Pending |
| FORM-07 | P1: Two contracts lifted (EntryTrigger contract) | Design | Pending |
| FORM-08 | P1: Two contracts lifted (Template contract) | Design | Pending |
| FORM-09 | P1: Two contracts lifted (barrel re-export) | Tasks | Pending |
| FORM-10 | P1: 10 forms migrated (useForm + zodResolver everywhere) | Design | Pending |
| FORM-11 | P1: 10 forms migrated (register + aria-invalid + aria-describedby) | Design | Pending |
| FORM-12 | P1: 10 forms migrated (Controller for controlled components) | Design | Pending |
| FORM-13 | P1: 10 forms migrated (field-level errors via FieldError) | Design | Pending |
| FORM-14 | P1: 10 forms migrated (server-error surface unchanged via FormError) | Design | Pending |
| FORM-15 | P1: 10 forms migrated (typed onSubmit payload) | Design | Pending |
| FORM-16 | P1: 10 forms migrated (bun check green) | Tasks | Pending |
| FORM-17 | P1: Auth forms split (4 dumb forms, no mutation/navigate) | Design | Pending |
| FORM-18 | P1: Auth forms split (4 smart-page route files) | Design | Pending |
| FORM-19 | P1: Auth forms split (field-level errors) | Design | Pending |
| FORM-20 | P1: Auth forms split (reset-password derived schema) | Design | Pending |
| FORM-21 | P1: Auth forms split (success/invalid-link sub-components preserved) | Design | Pending |
| FORM-22 | Test update — channel-account-form.spec reflects new error contract | Tasks | Pending |
| FORM-23 | ROADMAP.md updated with feature 045 entry | Tasks | Pending |
| FORM-24 | STATE.md updated with the doctrine lesson | Tasks | Pending |

**ID format:** `FORM-<NUMBER>`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 24 total, 0 mapped to tasks yet, 0 unmapped.

---

## Success Criteria

How we know the feature is successful:

- [ ] Every form file under `apps/web/src/routes/**/*-form.tsx` (10 files)
  satisfies the form-shape grep: `grep -L 'useForm' apps/web/src/routes/**/*-form.tsx`
  returns nothing; `grep -L 'zodResolver' apps/web/src/routes/**/*-form.tsx`
  returns nothing.
- [ ] No `useState` in any form file: `grep -l "useState" apps/web/src/routes/**/*-form.tsx`
  returns nothing.
- [ ] No `LabeledInput` references anywhere:
  `grep -r 'LabeledInput' apps/web/src` returns nothing.
- [ ] `bun check` exits 0 (typecheck + lint + format + tests + four
  `check-*.ts` scripts).
- [ ] `thermo-nuclear-code-quality-review` on the branch diff surfaces no
  blockers; any structural findings are addressed in-PR.
- [ ] Manual Chrome walk: each of the 10 forms shows a field-level error
  message + `aria-invalid` on the offending input when the user submits
  invalid data, and the top-of-form `<FormError>` stays empty unless the API
  returned an error.
- [ ] ADR-008 is Accepted, indexed in `docs/adr/README.md`, and references
  ADR-007.
- [ ] ROADMAP.md Phase 1.9 carries a `feature 045 — Forms RHF + Zod` line
  marked COMPLETE on merge.
