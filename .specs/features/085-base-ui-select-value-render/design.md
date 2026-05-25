# Base UI Select.Value renders the label (085) — Design

**Spec**: `.specs/features/085-base-ui-select-value-render/spec.md`
**Status**: Draft

---

## Architecture Overview

Three deliverables, all narrowly scoped (no new modules, no new contracts,
no runtime data model change):

1. **Two composed primitives fixed in place**
   (`components/composed/lookup-select.tsx`,
   `components/composed/plugin-select.tsx`) — change the body of
   `SelectValue` to render the option's label, derived from props the
   component already has in scope. Public API unchanged.
2. **One inline `<SelectValue />` fixed** at
   `routes/_app/workspace/cadences/-components/cadence-builder.tsx:135`
   — apply the same render-children idiom in place. The trigger lives
   inside the cadence-builder, so the fix is local; no new component.
3. **Rule artifact** `.agents/rules/base-ui.md` introduced, linked
   from `AGENTS.md` "Conventions and rules". The rule documents the
   Base UI idioms relevant to our primitives — starting with the
   `Select.Value` pitfall we just hit — and points at
   <https://base-ui.com/llms.txt> as the canonical external
   reference.

No new runtime behavior. The wire payload (the `value` we send/store)
is byte-for-byte identical before and after; only the trigger's
rendered text changes from "the value" to "the option's label".

---

## Code Reuse Analysis

### Existing patterns to mirror

| Component | Location | How to use |
| --------- | -------- | ---------- |
| `LookupSelect`'s `options: { value, label }[]` prop | `apps/web/src/components/composed/lookup-select.tsx` | Already in scope inside the component. The fix maps `value → label` from this same array. |
| `PluginSelect`'s `plugins.data?.plugins` list | `apps/web/src/components/composed/plugin-select.tsx` | Each plugin has `{ id, name }`. The fix finds `name` by `id`. |
| Cadence-builder's `preset` list | `routes/_app/workspace/cadences/-components/cadence-builder.tsx` | Already iterated in the same file to build `SelectItem`s; the inline `<SelectValue />` will read the same list. |
| Existing rule files | `.agents/rules/{conventions,code-standards,http,react,test,enums,comments,web-patterns}.md` | New rule mirrors the H1 + intro + numbered sections + Good/Bad examples format. |
| AGENTS.md rule index | `AGENTS.md` § "Conventions and rules" | Add one bullet for `base-ui.md` alongside the existing eight. |

### Integration points

| System | Integration method |
| ------ | ------------------ |
| `@base-ui/react/select` | Already imported in `components/primitives/select.tsx`. The fix touches **only** the composed wrappers; the primitive's surface (`SelectPrimitive.Value.Props`) already accepts `children: (value) => ReactNode` — no primitive change needed. |
| `AGENTS.md` | Add one bullet under "Conventions and rules" pointing at `base-ui.md`. The user's standing instruction is "never change AGENTS.md unless explicitly asked" — and this task explicitly asks (G4 in `spec.md`). |
| `web-patterns.md` § 3 (Forms) | No change. The fix lives below the form layer (inside the primitive composition). Forms continue to pass `value`/`onChange` unchanged. |

### CONCERNS.md check

No flagged components touched. The fix is in two composed UI files and
one inline trigger; nothing in `.specs/codebase/CONCERNS.md` covers
`apps/web/src/components/composed/` or the cadence-builder UI layer.
Regression risk is low; gate is `bun check` + visual verification at
three call sites + the (small) generated tests.

---

## Components

### A. `components/composed/lookup-select.tsx` (primary fix)

- **Purpose**: Composed wrapper around the Base UI `Select` primitive
  for `{ value, label }[]`-style lookups (the workhorse for ~80% of
  Selects in the app).
- **Public API (unchanged)**: `value: string`, `placeholder: string`,
  `options: { value: string; label: string }[]`,
  `onChange: (value: string) => void`, `disabled?: boolean`.
- **Change**: The `<SelectValue placeholder={props.placeholder} />`
  becomes `<SelectValue>{(v) => labelFor(v, props.options, props.placeholder)}</SelectValue>`
  where `labelFor` is a pure helper resolved as follows:
  - Empty/falsy `v` → `placeholder` (matches today's behavior).
  - `v` matches an `options[i].value` → return `options[i].label`.
  - `v` does **not** match (stale ID — see spec edge case) →
    return `placeholder`. The user sees a fallback instead of a
    raw UUID/ID; the `value` itself is untouched and the form still
    submits whatever it has.
- **Reuses**: The component receives `options` already; no new prop.

### B. `components/composed/plugin-select.tsx` (primary fix)

- **Purpose**: Composed wrapper around the Base UI `Select` primitive
  for the channel-plugin picker, sourced from
  `useChannelPlugins().data?.plugins`.
- **Public API (unchanged)**: `value: string`,
  `onChange: (value: string) => void`. Internal data source unchanged.
- **Change**: Same shape as A. The render-children function reads the
  in-scope `plugins.data?.plugins ?? []` array, finds the plugin whose
  `id === v`, returns its `name`. Same fallback chain: empty `v` →
  placeholder string; unmatched `v` (e.g. while
  `useChannelPlugins()` is still pending and the form already carries
  a value) → placeholder. The async-loading edge case (spec edge
  cases) collapses into the unmatched-value fallback.
- **Reuses**: `plugins.data?.plugins`, already retrieved.

### C. `routes/_app/workspace/cadences/-components/cadence-builder.tsx`
   (inline fix)

- **Purpose**: Inline Select inside the cadence-builder. The trigger
  on line 135 has the same shape: `<SelectValue />` with no children,
  picking from a `preset` list iterated below to build
  `SelectItem`s.
- **Change**: Apply the same render-children idiom locally. The
  `preset` list is already in scope; the trigger maps `value → label`
  inline. No extraction to a composed component (the trigger is
  one-off and the form is already large; we don't add an abstraction
  for one call site — code-standards rule against premature
  abstraction).

### D. Rule file: `.agents/rules/base-ui.md`

- **Purpose**: Operational rule for working with Base UI primitives
  in `apps/web` — the idioms that differ from Radix and other
  primitive libraries we previously used. The first section
  documents the `Select.Value` pitfall (the bug we just fixed); the
  remaining sections cover the render-prop pattern
  (`render={<X ... />}`), Field integration, and the
  function-children Value/`items`-on-Root choice.
- **Location**: `.agents/rules/base-ui.md`.
- **Structure** (matches existing rule files):
  - H1 + intro: scope, link to <https://base-ui.com/llms.txt> as
    canonical reference, note that the file is **not** script-gated.
  - § 1 "Select.Value renders the raw value by default" — the bug we
    just hit, with Bad and Good examples (function-children + items
    prop). Cites this feature folder (085) for context.
  - § 2 "The render-prop pattern" — Base UI's `render={<X .../>}`
    idiom (seen across `Select.Icon`, `Select.ItemIndicator`,
    `Popover.Trigger`, etc.). One worked example.
  - § 3 "Field integration" — Base UI's `Field` primitive provides
    `aria-invalid`/`aria-describedby` plumbing automatically; we
    currently wire it by hand in `components/primitives/field.tsx`.
    Brief pointer; no doctrine change yet.
  - § 4 "When to reach for the llms.txt" — the kinds of questions
    where the rule doesn't answer (Combobox API, controlled-vs-
    uncontrolled patterns for new primitives) and where the
    `base-ui.com/llms.txt` index is the right next step.
  - § 5 "Related" — links to `react.md` § 0 (shadcn-first primitives),
    `web-patterns.md`, and the shadcn skill.
- **Interfaces**: N/A (text artifact).
- **Dependencies**: None — pure documentation.
- **Reuses**: Format of existing rule files (Good/Bad fenced code
  blocks, no semicolons / single quotes / Tailwind-sorted in TS
  examples, English-only, no comments narrating what the code does).

### E. AGENTS.md link

- **Change**: Single bullet added under "Conventions and rules"
  pointing at `base-ui.md` with a one-line summary in the same voice
  as the other eight bullets.
- **No other AGENTS.md edits.** (User memory:
  `flow-run-all-steps-including-quality-review` and the explicit
  "Never change this file (AGENTS.md) unless the user explicitly
  asks" guard — both honored: the user explicitly asked in this
  feature's goals.)

---

## Data Models

N/A — no schema, no contract, no DTO change. The `value` on every
Select is the same string before and after. The trigger's rendered
text is derived purely on the client from props already in scope.

---

## Error Handling Strategy

| Scenario | Handling | User impact |
| -------- | -------- | ----------- |
| Stale `value` (orphaned ID — option since deleted) | `labelFor` returns the placeholder; the raw ID is **not** shown | User sees placeholder instead of a UUID; form keeps the value so they can re-pick or submit (per existing UX) |
| Empty options array | Trigger renders placeholder (unchanged) | None |
| Async-loaded options not yet resolved | Trigger renders placeholder (unchanged — same fallback as stale value) | Placeholder shows during the loading window instead of a momentary ID flash |
| Typecheck regression after the change | `bun typecheck` catches the mismatch (the render-children function returns `ReactNode` — TS verifies) | None — caught pre-commit |
| Visual regression in trigger styling | `data-placeholder` data-attribute on `SelectTrigger` already drives muted styling; the fallback path returns the placeholder string, which preserves the muted state via the same `data-placeholder:text-muted-foreground` rule | None |

The `data-placeholder` state on `SelectTrigger` deserves a callout:
the `data-placeholder:text-muted-foreground` Tailwind variant in
`select.tsx:41` activates when `Select.Value` is rendering the
placeholder. Base UI sets the trigger's `data-placeholder` based on
whether `Select.Value` is in its placeholder state. When we move from
"placeholder ignored, raw value shown" to "placeholder shown for
unmatched values", the muted styling kicks in automatically — no
extra wiring.

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| **`items` prop on Root vs function children on `SelectValue`** | Function children on `SelectValue` | The `items` prop is the recommended idiom **when the consumer also wants Base UI to handle item rendering inside the Popup**. In our setup, the consumer (the call site of `LookupSelect` / `PluginSelect`) still wants explicit `SelectItem` markup (we already iterate `options` to build the list). The function-children approach localizes the fix to one place — the `SelectValue` — without churning the rest of the composition or pushing a new API onto the primitives layer. |
| **Inline helper vs `lib/select-value-label.ts`** | Inline helper inside each composed file (≤5 lines) | Two composed components is below the "graduate to `composed/`" threshold (`web-patterns.md` § 1 — needs two or more **features** to graduate, not just two composed files). The helpers are pure and trivial; an extraction would add an import and a file for no gain. |
| **Touching `components/primitives/select.tsx` itself** | No | The primitive is correct — `SelectValue` already accepts `children`. The bug is in how the composed wrappers call it. Editing the primitive (e.g. to default to `Select.Value`'s label-rendering) would diverge from shadcn's generated source and create a maintenance footgun for future shadcn `add` runs. The composed layer is the right place to encode this idiom. |
| **Where the rule file lives** | `.agents/rules/base-ui.md` (sibling to `react.md`, `web-patterns.md`) | Established directory. Linked from AGENTS.md the same way other rules are. Not script-gated (the bug shape is not statically detectable without a Base UI-aware lint rule, and a string-match rule would have too many false positives — e.g. `<SelectValue placeholder=...>` *is* correct for the no-value-yet state). |
| **Test stance** | Focused web-unit tests on `LookupSelect` and `PluginSelect` (label render, fallback render); no test on the inline cadence-builder Select | The two composed primitives are "fat" in the `generate-tests` sense — they encode the label-resolution rule, including the stale-value fallback. The cadence-builder inline Select is "thin" — it iterates an existing list to pick a label, covered by visual + e2e if any. |
| **JSDoc on the rule file** | No JSDoc, just prose | `comments.md` § 5 reserves JSDoc for tool-surfaced public API. Rules are read by humans (and by Claude via the rule index); no IDE hover binds to a `.md` file. |
| **Reference the bug in the rule via "feature 085"** | No — drop the feature number | `comments.md` § 3 forbids referencing tasks/PRs/features inside committed artifacts. The rule explains the **why** (Base UI's default behavior) without anchoring to a session-specific feature number that would rot. |

---

## Test Strategy

Per AGENTS.md / `generate-tests`, classify each artifact:

- **`LookupSelect`** — fat (encodes the label-resolution rule + the
  stale-value fallback). Write a focused web-unit spec covering:
  (a) selected value renders the label, (b) empty value renders
  placeholder, (c) stale value renders placeholder (and not the raw
  ID).
- **`PluginSelect`** — fat (same shape as LookupSelect but resolves
  off the in-scope hook). Mock the hook; verify (a) label render,
  (b) async-loading fallback to placeholder, (c) stale value
  fallback.
- **Cadence-builder inline Select** — thin (pure local mapping
  inside a route file). Covered by manual verification + any
  existing route-level tests that already exercise the
  cadence-builder. No new dedicated test.
- **`base-ui.md` rule file** — pure documentation. No tests.
- **AGENTS.md edit** — single-bullet doc edit. No tests.

`generate-tests` is invoked for the fat work in step (tasks.md
T-04). The thin work is covered by `bun check` + visual
verification at the named call sites (success criteria in spec.md).
