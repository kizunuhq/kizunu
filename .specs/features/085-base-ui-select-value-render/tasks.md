# Base UI Select.Value renders the label (085) — Tasks

**Design**: `.specs/features/085-base-ui-select-value-render/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Rule + index (sequential)

```
T1
```

### Phase 2: Fixes (parallel after T1)

```
     ┌→ T2 [P] ─┐
T1 ──┼→ T3 [P] ─┼──→ T5
     └→ T4 [P] ─┘
```

### Phase 3: Tests + verification (sequential)

```
T5 → T6 → T7 → T8 → T9
```

---

## Task Breakdown

### T1: Add `.agents/rules/base-ui.md` + AGENTS.md index entry

**What**: Write the operational rule for working with Base UI primitives in
`apps/web`. § 1 documents the `Select.Value` renders-raw-value pitfall with a
Bad and a Good example (render-children function on the wrapper; `items` prop
on `Root` as the alternative). § 2 documents the Base UI `render={<X .../>}`
pattern with one worked example from our codebase
(`SelectPrimitive.Icon` in `components/primitives/select.tsx`). § 3 brief
pointer at Field integration. § 4 when to consult
<https://base-ui.com/llms.txt>. § 5 related rules. Add one bullet in AGENTS.md
"Conventions and rules" pointing at `base-ui.md` with the same one-line
summary shape as the other eight rules.

**Where**:

- `.agents/rules/base-ui.md` (new)
- `AGENTS.md` (one bullet under "Conventions and rules")

**Depends on**: None

**Reuses**: Format of `.agents/rules/{conventions,code-standards,http,react,test,enums,comments,web-patterns}.md`;
the `SelectPrimitive` import already in `components/primitives/select.tsx` as
the canonical render-prop example.

**Requirement**: SEL-06, SEL-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `.agents/rules/base-ui.md` exists with the five sections above; ≤ ~150
      lines total; English only; no comments narrating code in the examples.
- [ ] § 1 contains a Bad block (current shape:
      `<SelectValue placeholder=... />`) and a Good block (render-children +
      `items` prop alternative); cites Base UI default behavior, not a feature
      number.
- [ ] § 2 shows the `render={<X .../>}` pattern.
- [ ] § 4 includes the literal URL `https://base-ui.com/llms.txt`.
- [ ] AGENTS.md "Conventions and rules" section lists `base-ui.md` with a
      one-line summary; placement reads naturally alongside `react.md` and
      `web-patterns.md`.
- [ ] No semicolons / single quotes in TS code samples; matches repo style.
- [ ] No `// 1.`, `// Arrange / Act / Assert`, or task/PR references inside
      the rule (per `comments.md` § 3 + § 4).

**Tests**: none (pure documentation)
**Gate**: none (verified visually + read-back)

**Verify**:

```
test -f .agents/rules/base-ui.md && \
  grep -q "Select.Value" .agents/rules/base-ui.md && \
  grep -q "base-ui.com/llms.txt" .agents/rules/base-ui.md && \
  grep -q "base-ui.md" AGENTS.md
```

**Commit**: `docs(rules): add base-ui.md operational rule`

---

### T2: Fix `LookupSelect` to render the option's label [P]

**What**: Replace `<SelectValue placeholder={props.placeholder} />` with a
render-children function that resolves `value → label` from the in-scope
`props.options` array. Empty `value` returns `placeholder`; unmatched
`value` (stale ID — spec edge case) also returns `placeholder`. Extract the
resolution into a 3-line `resolveLabel` helper **inside the same file** (no
new module per design.md decision). Keep the file ≤50 lines per
`react.md` § 9.

**Where**:

- `apps/web/src/components/composed/lookup-select.tsx` (edit in place)

**Depends on**: T1 (rule must land first so the reviewer sees the doctrine
in the same diff)

**Reuses**: The existing `options: { value, label }[]` prop already passed
by every call site; the existing `placeholder` prop.

**Requirement**: SEL-01, SEL-04, SEL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SelectValue` receives a function child `(v) => string` that resolves
      the label or returns `placeholder` on empty/unmatched value.
- [ ] No new props on `LookupSelect`; public API unchanged (verified by call
      sites compiling unchanged).
- [ ] File stays under 50 lines (currently 36; the change adds ~5 lines).
- [ ] No comments narrating the change; the helper's name carries the
      intent.
- [ ] Stale-value path (value not in options) returns `placeholder` — NOT
      the raw value.

**Tests**: covered by T5 (focused web unit spec)
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck
```

**Commit**: `fix(web): lookup-select trigger renders label, not value`

---

### T3: Fix `PluginSelect` to render the plugin's name [P]

**What**: Same pattern as T2. The in-scope source is
`plugins.data?.plugins ?? []` from `useChannelPlugins()`; the resolution is
`{ id, name }[] → name by id`. Empty `value` → `placeholder` string
("Choose a channel plugin"). Unmatched `value` (async-loading edge case,
or plugin removed from registry) → `placeholder`. Same 3-line
`resolveLabel` helper inside the file.

**Where**:

- `apps/web/src/components/composed/plugin-select.tsx` (edit in place)

**Depends on**: T1

**Reuses**: `useChannelPlugins()` data already retrieved.

**Requirement**: SEL-02, SEL-04, SEL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SelectValue` receives a function child resolving `id → name`.
- [ ] No new props on `PluginSelect`; public API unchanged.
- [ ] File stays under 50 lines (currently 33).
- [ ] Async-loading window (plugins not yet resolved + form already has a
      `value`) renders the placeholder, NOT the raw id.

**Tests**: covered by T5 (focused web unit spec)
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck
```

**Commit**: `fix(web): plugin-select trigger renders plugin name, not id`

---

### T4: Fix the inline `<SelectValue />` in cadence-builder [P]

**What**: Apply the same render-children idiom to the inline trigger at
`apps/web/src/routes/_app/workspace/cadences/-components/cadence-builder.tsx:135`.
The `preset` list is already iterated in the same file to build the
`SelectItem`s; the trigger maps `value → label` from that same list. No
extraction to a composed component (design.md decision: one-off, premature
abstraction).

**Where**:

- `apps/web/src/routes/_app/workspace/cadences/-components/cadence-builder.tsx`
  (edit in place)

**Depends on**: T1

**Reuses**: The local `preset` array already in scope.

**Requirement**: SEL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The inline `<SelectValue />` (line ~135) becomes
      `<SelectValue>{(v) => …}</SelectValue>`, resolving against the local
      preset list.
- [ ] Empty `value` falls back to a sensible placeholder string consistent
      with the surrounding form copy.
- [ ] No new helper modules; the resolution stays inline (≤3 lines).
- [ ] No regression in the rest of the cadence-builder (file diff confined
      to the trigger).

**Tests**: none new (thin per design.md); existing route-level coverage +
manual verification cover it
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck
rg -n "<SelectValue" apps/web/src/routes/_app/workspace/cadences/-components/cadence-builder.tsx
# Expected: the matching line now contains `>{` (function-children) or `<SelectValue>` opens
```

**Commit**: `fix(web): cadence-builder inline select renders preset label`

---

### T5: Author focused web-unit tests for `LookupSelect` + `PluginSelect`

**What**: Invoke the `generate-tests` skill against the two changed
composed components. The skill classifies each as fat (encodes the
label-resolution rule + the stale-value fallback). Expected outcome: two
small Vitest specs under
`apps/web/src/components/composed/__test__/` covering the label-render,
empty-value placeholder, and stale-value placeholder paths. No test on
the cadence-builder inline Select (thin per design.md).

**Where**:

- `apps/web/src/components/composed/__test__/lookup-select.spec.tsx`
  (new, exact filename owned by the skill)
- `apps/web/src/components/composed/__test__/plugin-select.spec.tsx`
  (new, exact filename owned by the skill)

**Depends on**: T2, T3 (the code under test must exist first)

**Reuses**: `vitest` + harness already wired in
`components/primitives/__test__/harness-smoke.spec.tsx`.

**Requirement**: SEL-01, SEL-02, SEL-05

**Tools**:

- MCP: NONE
- Skill: `generate-tests`

**Done when**:

- [ ] `generate-tests` produces specs for both composed files.
- [ ] Each spec covers: (a) label render after selection,
      (b) empty-value placeholder, (c) stale/unmatched-value placeholder.
- [ ] `bun test:unit` runs the new specs and passes.
- [ ] No new tests authored for the cadence-builder inline Select.

**Tests**: web-unit (Vitest)
**Gate**: `bun test:unit`

**Verify**:

```
bun test:unit
```

**Commit**: `test(web): cover lookup-select and plugin-select label render`

---

### T6: `bun check` gate (full)

**What**: Run the full quality gate; iterate fixes until green.

**Where**: Repo root.

**Depends on**: T5

**Reuses**: `scripts/check.sh` orchestration.

**Requirement**: SEL-04 (no public-API drift) + all others (gate)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `bun check` exits 0 (typecheck + `bunx vp check` lint/format/tests +
      `check-import-depth.ts` + `check-zod-v4.ts` +
      `check-drizzle-schema-naming.ts` + `drizzle-checksums.ts verify`).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.

**Tests**: full gate
**Gate**: full

**Verify**:

```
bun check
CI=1 bunx vp lint
```

**Commit**: (none — gate task; commits land on T1–T5)

---

### T7: `thermo-nuclear-code-quality-review` on branch diff

**What**: Invoke the strict-maintainability skill against the branch diff.
Apply every structural fix it raises (not just cosmetic). Re-run
`bun check`.

**Where**: Branch `fix/base-ui-select-value-render`.

**Depends on**: T6

**Reuses**: `thermo-nuclear-code-quality-review` skill.

**Requirement**: AGENTS.md flow step 6

**Tools**:

- MCP: NONE
- Skill: `thermo-nuclear-code-quality-review`

**Done when**:

- [ ] Skill runs; every raised finding is either fixed or has a written
      one-line rebuttal in the PR description.
- [ ] `bun check` re-runs green after fixes.

**Tests**: none (review)
**Gate**: full (re-run after fixes)

**Verify**: Skill output captured; `bun check` exit 0.

---

### T8: Verify spec alignment + visual smoke in the browser

**What**: Walk the spec acceptance criteria (AC 1–7) against the
implemented behavior. Bring up `bun dev` and visually verify at three
named call sites: a `LookupSelect` (e.g. settings/connectors), a
`PluginSelect` (settings/channels), and the cadence-builder inline
Select. Each trigger shows the picked option's label, not its
value/ID; placeholder shows for stale/orphaned values where reachable.

**Where**: Running dev server + browser (Chrome MCP).

**Depends on**: T7

**Reuses**: `bun dev`, `mcp__claude-in-chrome__*`.

**Requirement**: All SEL-*

**Tools**:

- MCP: claude-in-chrome (navigate + screenshot)
- Skill: `verify` (optional helper)

**Done when**:

- [ ] Screenshot or written observation captured at each of the three
      named call sites confirming label-not-ID.
- [ ] AC 1–7 in spec.md checked off; no `SPEC_DEVIATION` outstanding.

**Tests**: manual (browser)
**Gate**: none

**Verify**: Notes attached to the PR description.

---

### T9: `review-and-ship` → PR + `ci-watcher` → squash-merge

**What**: Final correctness/intent review via the skill; commit, push, open
PR against `master` with the rule + the three fixes cited; watch CI;
`fix-ci` if anything goes red; squash-merge once green. Delete branch.

**Where**: Branch → PR → `master`.

**Depends on**: T8

**Reuses**: `review-and-ship` + `ci-watcher` + `fix-ci` skills.

**Requirement**: AGENTS.md flow steps 8–11

**Tools**:

- MCP: NONE
- Skill: `review-and-ship`, `ci-watcher`, `fix-ci`

**Done when**:

- [ ] PR opened against `master` with description quoting the rule and the
      three fixes; verification notes from T8 attached.
- [ ] CI (the `Required (CI)` aggregator) is green.
- [ ] Squash-merged to `master`; branch deleted.
- [ ] STATE.md gains a Lessons entry: "Base UI Select.Value doesn't mirror
      child text — must use render-children or `items` prop. Doctrine in
      `.agents/rules/base-ui.md`."

**Tests**: full CI
**Gate**: full

**Verify**: `gh pr view --json mergedAt,state` shows merged.

---

## Parallel Execution Map

```
Phase 1 (sequential):
  T1 (rule + AGENTS.md index)

Phase 2 (parallel after T1):
  ├── T2 [P]  fix LookupSelect
  ├── T3 [P]  fix PluginSelect
  └── T4 [P]  fix cadence-builder inline Select

Phase 3 (sequential):
  T5 (tests) ──→ T6 (bun check) ──→ T7 (thermo-nuclear) ──→ T8 (visual) ──→ T9 (ship)
```

Each [P] task touches a disjoint file set (different composed component / a
different route file). The render-children helper is local to each file —
no shared mutable state.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | rule file + AGENTS.md index | ✅ Granular |
| T2 | one composed file edit (~5 LOC) | ✅ Granular |
| T3 | one composed file edit (~5 LOC) | ✅ Granular |
| T4 | one inline edit in one route file | ✅ Granular |
| T5 | two test files via skill | ✅ Granular |
| T6 | gate run | ✅ Granular |
| T7 | review skill + fixes | ✅ Granular |
| T8 | three visual checks | ✅ Granular |
| T9 | PR lifecycle | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T2, T3 | T2/T3 → T5 (T4 is thin → no test) | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |

All match.

---

## Test Co-location Validation

| Task | Code layer | Matrix requires | Task says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | rule doc | none | none | ✅ |
| T2 | fat composed (label-resolution rule) | focused web unit | via T5 | ✅ |
| T3 | fat composed (label-resolution rule) | focused web unit | via T5 | ✅ |
| T4 | thin inline (one-off mapping) | none (visual / e2e covers) | none | ✅ |
| T5 | tests | (this IS the test step) | yes | ✅ |
| T6 | gate | full | full | ✅ |
| T7 | review | full (re-run) | full (re-run) | ✅ |
| T8 | manual verify | (visual smoke) | yes | ✅ |
| T9 | CI gate | full | full | ✅ |

**Rationale for thin/fat split**: per `TESTING.md`'s coverage matrix and
`generate-tests`' thin/fat classification — the two composed components
encode a rule (resolve label, fall back to placeholder on stale/empty); the
cadence-builder inline Select is a single-spot mapping covered by visual
verification + any existing route-level tests.

---

## Tools and skills

- **Rule file + AGENTS.md (T1)**: hand-written, no skill.
- **Fixes (T2–T4)**: hand-edited; mechanical scope.
- **Tests (T5)**: `generate-tests` skill.
- **Gate (T6)**: `bun check` shell.
- **Quality review (T7)**: `thermo-nuclear-code-quality-review` skill.
- **Visual verify (T8)**: claude-in-chrome MCP (navigate + screenshot).
- **Ship (T9)**: `review-and-ship` → `ci-watcher` → `fix-ci`.

No MCPs needed for the implementation tasks themselves.
