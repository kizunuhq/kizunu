# ADR-008: Forms use react-hook-form + zodResolver bound to contract schemas

- **Date**: 2026-05-24
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: web, frontend, forms, validation

## Context and Problem Statement

ADR-007 codified web-frontend layering — route-colocation, hook return
shape, invalidation ownership, URL state — and named a "smart-page /
dumb-form split" in `.agents/rules/web-patterns.md` §3. The §3 recipe at
the time mandated `useState` per field, manual `event.preventDefault()` +
branching validation, and a single top-of-form `<FormError>` banner that
conflated UI validation with server errors. The 044 sweep landed every
inline CRUD surface on `ResourceDialog` + dumb-form, which made the
limitation visible: every form file repeated ~3 lines per field of state
plumbing; cross-field rules became hand-rolled `pickInlineError` /
`setValidationError` helpers; the contract schema in `@kizunu/api-contracts`
was duplicated by native `required` / inline checks at the call site;
field-level `aria-invalid` / `aria-describedby` were nowhere set even
though `Input`'s Tailwind already styled them.

The web app already carries `react-hook-form@^7.72.0` +
`@hookform/resolvers@^5.2.2`, and `FieldError`
(`apps/web/src/components/primitives/field.tsx:166`) was authored to
accept either `children` or an `errors[]` array — RHF-ready. The plumbing
was sitting unused.

A reference pattern from a peer project (a login form using
`useForm + zodResolver`, `register`-spread, per-field `<FieldError>`,
`aria-invalid` + `aria-describedby`, dumb-form contract
`{ id, isPending, onSubmit }`) made the gap concrete. This ADR records
the calls that resolve it and supersedes the §3 recipe inside
`web-patterns.md`.

## Decision Drivers

- One form recipe across every `*-form.tsx` in `apps/web` — no
  "auth is special" footnote, no "this form is too small to bother"
  footnote.
- Reuse the contract schema in `@kizunu/api-contracts` as the validation
  source. Drift between API and UI validation is a class of bug the type
  system can't catch but the schema can.
- Field-level errors localize better than top banners; `aria-invalid` +
  `aria-describedby` are accessibility table stakes that the existing
  primitives already style for.
- Keep the dumb-form / smart-page split ADR-007 §form-recipe established;
  the parent (route file or dialog wrapper) stays the only owner of
  mutation, navigation, toast, and server-error capture.

## Considered Options

### Field-state owner

- **A** — `react-hook-form` `useForm` owns every form's field state. Forms
  do not call `useState` for field values.
- **B** — Keep `useState` per field; introduce RHF only when a form grows
  >5 fields or a cross-field rule. (Status quo per the prior `web-patterns.md` §3.)

### Validation source

- **A** — `zodResolver(<contract schema from @kizunu/api-contracts>)`. UI-only
  rules (confirmPassword match, JSON-body parse, plugin-required credentials)
  live in a derived `formSchema = base.extend(...).superRefine(...)` next to
  the form. Contracts stay pure mirrors of the API DTO.
- **B** — Lift UI-only rules into the contract package so there is one
  schema per endpoint, full stop.
- **C** — Keep native `required` / hand-rolled `pickInlineError` helpers /
  manual `setValidationError`.

### Error surface

- **A** — Field-level errors (`errors.<field>.message`) render inside the
  field via `<FieldError id="<field>-error">`, wiring `aria-invalid` +
  `aria-describedby`. Top-of-form `<FormError>` is reserved for
  **server errors not attributable to one field** (the
  `useMutationDialog` / smart-page `error` string).
- **B** — Keep a single top-of-form banner that merges both surfaces (the
  status quo `displayError = validationError ?? error` pattern).

### Form-component contract

- **A** — Dumb: props `{ id, defaultValues?, isPending, onSubmit, error? }`.
  No mutation hooks, no `useNavigate`, no `PageHeader`. The parent — route
  file (auth) or dialog wrapper — owns side-effects.
- **B** — Combined: auth forms keep owning `PageHeader` + mutation +
  navigation since they ARE the page; dialog forms stay dumb. The rule
  carves out an "auth is the exception" clause.

## Decision Outcome

Chosen options: **A** on all four.

- **Field-state owner**: `react-hook-form`'s `useForm`. Per-field `useState`
  is forbidden in form components. Edit-mode forms use `useForm({ defaultValues })`.
- **Validation source**: `zodResolver(<contract schema>)`. UI-only rules
  live as derived schemas in the form file. `@kizunu/api-contracts` stays
  pure.
- **Error surface**: field-level (`<FieldError id>` + a11y) and top
  (`<FormError>`, server-only) are deliberately separate. They can render
  concurrently.
- **Form contract**: dumb. No exceptions. Auth forms split into a dumb
  form + smart-page route file (`routes/auth/{login,signup,forgot-password,
  reset-password}.tsx`).

The detailed recipes — native input via `register`, controlled input via
`<Controller>`, derived `formSchema` for UI-only rules — live in
`.agents/rules/web-patterns.md` §3. This ADR captures the load-bearing
calls so that future PRs are judged against them, and so that reversing
any one of them goes through a new superseding ADR rather than a Slack
thread.

### Positive Consequences

- One form recipe across 10 existing forms and every future form. A new
  contributor reading any form file sees the same shape; reviews stop
  re-deciding per-feature.
- Validation drift between API and UI is structurally impossible — the
  same zod schema runs in both places. Adding a new field to the contract
  surfaces in the form's `errors.<field>` immediately.
- Field-level error rendering + a11y wiring is correct by construction; the
  `Input` primitive's `aria-invalid:*` styles finally fire.
- The `<FormError>` top banner regains a clear, narrow semantic — it
  appears only when the API rejected the submission.
- Form files shrink (per-field `useState` chunks gone), well under the
  `react.md` §9 50-line limit.

### Negative Consequences

- The two RHF imports (`useForm` + `zodResolver`) appear in every form
  file — the price of avoiding an additional in-house wrapper.
- Controlled components (`LookupSelect`, `PluginSelect`, the dynamic
  credential inputs) need `<Controller>` wrapping; that adds 4–6 lines per
  control. The trade is worth it because the inputs gain `fieldState.error`
  cleanly.
- Auth forms get an additional split (form + route file). The route file
  owns navigation + the per-feature error-copy mapper (`mapLoginError`).
  A one-time cost for cross-form consistency.

## Pros and Cons of the Options

**Field-state A (RHF)** — single source of field state, dirty/touched
tracking for free, double-submit naturally blocked by `handleSubmit`,
`defaultValues` clean for edit mode.
**Field-state B (status quo)** — fewer dependencies in any one form file,
but every form pays the per-field-`useState` tax forever and edit mode
requires another `useEffect`-on-prop-change patch per field.

**Validation A (contract + derived)** — one schema authoritative for the
network contract; UI rules where they belong; type-safe payload to
`onSubmit`.
**Validation B (lift UI into contract)** — single zod object per endpoint,
but the contract package leaks UI concerns the backend never validates.
The boundary between API DTO and UI form blurs.
**Validation C (native + ad-hoc)** — what we had. Native `required` can
only express one rule; everything else is hand-rolled and untyped.

**Error A (split)** — users see *where* the error is; screen readers route
correctly; the top banner has a clear meaning.
**Error B (merged top banner)** — simpler one-slot rendering, but users
playing whack-a-mole with which field caused the error.

**Contract A (dumb)** — same shape for every form, one rule for the §3
example to live up to.
**Contract B (carve-out for auth)** — auth forms one screen smaller, but
the rule needs an "auth is the exception" footnote, and a contributor
writing a new auth-style form (e.g. a future "complete profile" page)
re-learns the exception.

## Migration Policy

- This ADR + the accompanying `web-patterns.md` §3 rewrite + the
  `react.md` §3 carve-out + the deletion of `LabeledInput` + the 10-form
  sweep ship as feature `045` on a single branch. No transition clause —
  the rule is fully enforced from merge.
- The auth split moves four forms from page-and-form-combined into
  dumb-form + smart-page (`routes/auth/{login,signup,forgot-password,
  reset-password}.tsx`).
- Two forms (`entry-trigger-form.tsx`, `template-form.tsx`) drop their
  local `*FormValues` interfaces and import the corresponding contracts
  (`CreateEntryTriggerRequestSchema`, `CreateTemplateRequestSchema`) that
  already existed in `@kizunu/api-contracts/{engine,cadence}` — no new
  contract files needed.

## References

- `.agents/rules/web-patterns.md` §3 (form recipe — three sub-sections).
- `.agents/rules/web-patterns.md` §10 (new-feature checklist item 8).
- `.agents/rules/react.md` §3 (form-state carve-out).
- `.agents/rules/comments.md` — no section markers, no PR/task references.
- `.agents/rules/code-standards.md` §10 — ≤30-line functions.
- `docs/adr/007-web-frontend-layering.md` — the layering doctrine this
  ADR extends. ADR-008 narrows §form-recipe; ADR-007's other four calls
  (layering, hook shape, invalidation, URL state) stay in force.
- `apps/web/src/components/primitives/field.tsx` — `FieldError` accepts
  RHF-shaped `errors[]` natively.
- `apps/web/src/components/composed/form-error.tsx` — top-of-form banner,
  now semantically narrowed to server errors.
- `apps/web/src/lib/use-mutation-dialog.ts` — owns server-error capture
  for dialog forms.
