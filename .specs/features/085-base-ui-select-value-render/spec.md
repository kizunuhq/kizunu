# Base UI Select.Value renders the label, not the ID (085) — Specification

## Problem Statement

Our shadcn `base-nova` preset wraps Base UI primitives. Base UI's
`Select.Value`, **unlike Radix**, does not automatically reflect the
selected `SelectItem`'s child text in the trigger. When neither a
`children` render function nor an `items` prop on `Select.Root` is
provided, `Select.Value` renders the **raw selected value** — which in
our code is almost always a UUID/ID.

Concretely, every call site of `LookupSelect` and `PluginSelect`, and
the inline select inside
`apps/web/src/routes/_app/workspace/cadences/-components/cadence-builder.tsx:135`,
display the option's value (a UUID, a plugin id like
`pipedrive-token`, a cadence id) instead of its human label as soon as
the user picks an option. The dropdown lists the labels correctly; only
the trigger is broken.

The defect is not local to one call site — it is the shape of the
composed primitive itself. Fixing the two composed components plus the
single inline trigger covers every reachable Select in the app today
(11 call sites of `LookupSelect`, 3 of `PluginSelect`, 1 inline).

## Goals

- [ ] **G1 — Selected value displays the option label** in every
      reachable Select trigger across `apps/web`: every existing call
      site of `LookupSelect`, `PluginSelect`, and the inline select in
      `cadence-builder.tsx` shows the label string the user picked, not
      the value/ID.
- [ ] **G2 — Public APIs of `LookupSelect` and `PluginSelect` do not
      change.** Callers continue to pass the same props
      (`{ value, label }[]` for `LookupSelect`; the implicit plugin
      list for `PluginSelect`). No call site needs to be touched
      beyond the inline `cadence-builder.tsx` fix.
- [ ] **G3 — A new rule `.agents/rules/base-ui.md`** documents the
      Base UI idioms relevant to our primitives: how `Select.Value`
      renders (render-function children vs `items` prop), Field
      integration, the render-prop pattern (`render={<X .../>}`) seen
      across `Select.Icon`, `Select.ItemIndicator`, etc., and a
      pointer to <https://base-ui.com/llms.txt> as the canonical
      external reference. Tone matches `react.md` / `web-patterns.md`:
      concrete, short, no script gate.
- [ ] **G4 — AGENTS.md "Conventions and rules" links the new rule**
      alongside `react.md`, `web-patterns.md`, etc., so a future
      contributor lands on it before touching `components/primitives/`.

## Out of Scope

| Item | Reason |
| --- | --- |
| Migrating away from Base UI | Choice already taken via shadcn `base-nova` preset; that's an ADR-level pivot, not a fix |
| Auditing every other Base UI primitive (`Tabs`, `Popover`, `Dialog`, etc.) for similar latent bugs | Out-of-band sweep; this feature is scoped to Select, where the bug is observed |
| Changing `LookupSelect` / `PluginSelect` public props | G2 makes that an anti-goal |
| Adding new selects, new options, or new dropdown features | This is a fix + doctrine slice |
| Sweeping bare-`<SelectValue />` usage in tests/storybook | Tests don't render to a real DOM in the bug shape; if a test exists it will be updated as part of test work, not as scope |

## Acceptance Criteria

1. **WHEN** the user picks an option from a `LookupSelect`, **THEN**
   the trigger SHALL render the option's `label` string (e.g.
   "Pipedrive — Acme") and not its `value` (a UUID).
2. **WHEN** the user picks a plugin from a `PluginSelect`, **THEN**
   the trigger SHALL render the plugin's `name` (e.g. "Meta WhatsApp
   Cloud") and not its `id` (e.g. `meta-whatsapp-cloud`).
3. **WHEN** the user picks a preset in the cadence-builder inline
   Select, **THEN** the trigger SHALL render the preset's display
   label and not its `key`.
4. **WHEN** a `LookupSelect` / `PluginSelect` is rendered with no
   selected value, **THEN** the trigger SHALL render the
   `placeholder` string in the muted style already wired via
   `data-placeholder` (unchanged behavior).
5. **WHEN** a `LookupSelect` is rendered with a `value` that does not
   match any option (stale / orphaned value, e.g. an entity since
   deleted), **THEN** the trigger SHALL render the `placeholder` —
   the same fallback as the empty-value case — not the raw stale ID.
6. **WHEN** a contributor reads `AGENTS.md`'s "Conventions and rules"
   section, **THEN** they SHALL see `base-ui.md` listed alongside
   `react.md` and `web-patterns.md`, with the same one-line summary
   pattern; **AND** opening it SHALL surface the Select.Value
   pitfall, the render-prop idiom, and the
   <https://base-ui.com/llms.txt> pointer within the first screen.
7. **WHEN** a contributor reads `.agents/rules/base-ui.md`, **THEN**
   the document SHALL be ≤ ~150 lines (matches the brevity of
   `react.md`), in English, with bad/good examples for at least the
   `Select.Value` case.

## Edge Cases

- **Stale value (orphaned ID):** covered by AC 5 — render
  `placeholder`, not the ID. This is the most likely real-world
  regression we'd see today (a cadence references a deleted template,
  a journey references a deleted connector) and is the very symptom
  that exposed the bug.
- **Empty options array:** the trigger SHALL render the placeholder;
  picking is impossible. No change from today's behavior.
- **Async-loaded options (e.g. `PluginSelect` while
  `useChannelPlugins()` is still pending):** if the form already
  carries a `value` whose label is not yet in scope, the trigger
  SHALL render the placeholder, **not** the raw ID, until the options
  resolve. (This is a stricter contract than "render the ID until we
  know better" — the placeholder is always the right fallback.)

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SEL-01 | G1 — LookupSelect renders label | Tasks | Pending |
| SEL-02 | G1 — PluginSelect renders label (incl. async-loading edge) | Tasks | Pending |
| SEL-03 | G1 — cadence-builder inline Select renders label | Tasks | Pending |
| SEL-04 | G2 — Public APIs unchanged | Tasks | Pending |
| SEL-05 | G1/edge — Stale value renders placeholder, not raw ID | Tasks | Pending |
| SEL-06 | G3 — `.agents/rules/base-ui.md` introduced | Tasks | Pending |
| SEL-07 | G4 — AGENTS.md links the rule | Tasks | Pending |

**Coverage:** 7 total, all mapped in `tasks.md`, 0 unmapped.

## Success Criteria

- [ ] Manual verification at three concrete call sites:
      `LookupSelect` in `routes/_app/workspace/cadences/.../template-form.tsx`,
      `PluginSelect` in `routes/_app/settings/channels/.../channel-account-form.tsx`,
      and the inline select in `cadence-builder.tsx`. Each trigger
      shows the picked label, never an ID.
- [ ] `bun check` green (typecheck + `vp check` + drizzle checksum +
      import-depth + zod-v4 + drizzle-naming).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.
- [ ] thermo-nuclear code-quality review of the branch diff raises
      zero structural concerns (or all raised items are resolved
      before ship).
- [ ] A new contributor introducing the next Base UI primitive can
      reach `.agents/rules/base-ui.md` in one hop from `AGENTS.md`.
