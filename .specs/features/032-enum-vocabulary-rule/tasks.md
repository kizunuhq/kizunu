# Enum Vocabulary Rule Tasks

**Design**: `.specs/features/032-enum-vocabulary-rule/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Documentation (sequential)

```
T1
```

### Phase 2: Refactors (parallel after T1 lands)

```
     ┌→ T2 [P] ─┐
T1 ──┼→ T3 [P] ─┼──→ T6
     ├→ T4 [P] ─┤
     └→ T5 [P] ─┘
```

### Phase 3: Verification (sequential)

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Add `.agents/rules/enums.md`

**What**: Write the operational rule for closed-vocabulary types — default
const-object pattern, PayloadMap extension with WebhookEvent example, two named
exceptions (React variant props, internal narrowings of well-known externals),
ADR-002 back-link. Add a one-line bullet to `AGENTS.md` § "Conventions and rules"
naming the new file alongside the other five.
**Where**: `.agents/rules/enums.md` (new); `AGENTS.md` (one-line index addition)
**Depends on**: None
**Reuses**: Format of `.agents/rules/{conventions,code-standards,http,react,test}.md`;
shape of `apps/api/src/modules/workspace/core/domain/verification-token.ts` for the
Good example.
**Requirement**: ENUM-01, ENUM-02, ENUM-03, ENUM-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `.agents/rules/enums.md` exists with sections: § 1 default, § 2 PayloadMap
      extension, § 3 exceptions, § 4 related.
- [ ] § 1 contains a Good and a Bad example; the Good example mirrors
      `VerificationTokenType` shape.
- [ ] § 2 includes the WebhookEvent example (correct spelling
      `PaymentSucceeded`); shows compile-time error for the Bad handler.
- [ ] § 3 names both exceptions (React variant props; internal narrowings of
      well-known externals like HTTP verbs) with one worked example each.
- [ ] § 4 links `docs/adr/002-enum-as-const-object.md` and the three canonical
      in-repo files.
- [ ] AGENTS.md § "Conventions and rules" lists `enums.md` with a one-line
      summary, alongside the existing five.
- [ ] No semicolons / single quotes in TS code samples; matches repo style.

**Tests**: none (pure documentation)
**Gate**: none (verified visually + read-back)

**Verify**:

```
test -f .agents/rules/enums.md && \
  grep -q "PayloadMap" .agents/rules/enums.md && \
  grep -q "ADR-002" .agents/rules/enums.md && \
  grep -q "enums.md" AGENTS.md
```

**Commit**: `docs(rules): add enums.md operational rule (feature 032)`

---

### T2: Promote `MetaSubscriptionStep` to const-object [P]

**What**: Split `MetaSubscriptionStep` into its own file as a const-object +
derived type; the exception class imports it. Update both call sites in
`meta-subscribe.ts` to use `MetaSubscriptionStep.AppSubscription` /
`.WabaSubscription`. Test files' wire-payload literal assertions stay as-is.
**Where**:

- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-step.ts` (new)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception.ts` (edit — remove inline type, import from new file)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscribe.ts` (edit — two call sites + import)

**Depends on**: T1 (rule must land first so reviewers see the pattern in the
diff context).
**Reuses**: `verification-token.ts` template.
**Requirement**: ENUM-04, ENUM-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `meta-subscription-step.ts` exports the const object + derived type, with
      JSDoc summarizing the two values.
- [ ] `meta-subscription-failed.exception.ts` imports the type and uses it as
      the constructor's `step` parameter type (no inline type definition).
- [ ] `meta-subscribe.ts` lines 67 and 89 use `MetaSubscriptionStep.AppSubscription`
      / `.WabaSubscription` (no `'app-subscription'` / `'waba-subscription'`
      literals at throw sites).
- [ ] Unit test assertions on the wire `{ step: 'app-subscription' }` payload
      stay literal.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: existing unit tests for `meta-subscribe.spec.ts` (currently
      passing) continue to pass; no test deletions.

**Tests**: none (refactor; existing unit tests are the safety net)
**Gate**: quick

**Verify**:

```
rg -n "'(app|waba)-subscription'" apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscribe.ts
# Expected: no matches (only the test files should still contain the literals)
bun test:unit
```

**Commit**: `refactor(api): promote MetaSubscriptionStep to const-object (feature 032)`

---

### T3: Promote `MetaConnectStep` to const-object [P]

**What**: Split `MetaConnectStep` into its own file as a const-object + derived
type; the exception class imports it. Update both call sites in
`meta-coex-token.ts` to use `MetaConnectStep.CodeExchange` / `.RefreshExchange`.
Test files' wire-payload literal assertions stay as-is.
**Where**:

- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-connect-step.ts` (new)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-connect-failed.exception.ts` (edit)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-coex-token.ts` (edit — two call sites + import)

**Depends on**: T1
**Reuses**: `verification-token.ts` template.
**Requirement**: ENUM-05, ENUM-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `meta-connect-step.ts` exports the const object + derived type with JSDoc.
- [ ] `meta-connect-failed.exception.ts` imports the type; no inline definition.
- [ ] `meta-coex-token.ts` lines 56 and 75 call `readToken(response,
      MetaConnectStep.CodeExchange)` / `MetaConnectStep.RefreshExchange`.
- [ ] Unit test assertions on the wire `{ step: 'code-exchange' }` payload stay
      literal.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: existing unit tests pass; no deletions.

**Tests**: none (refactor)
**Gate**: quick

**Verify**:

```
rg -n "'(code|refresh)-exchange'" apps/api/src/modules/channel/plugins/meta-whatsapp/meta-coex-token.ts
# Expected: no matches
bun test:unit
```

**Commit**: `refactor(api): promote MetaConnectStep to const-object (feature 032)`

---

### T4: Promote `ChannelCredentialFieldType` to const-object [P]

**What**: Convert the bare-union in `channel-credential-field-type.ts` to
const-object + derived type (file stays — already one type per file). Update
every plugin manifest's credential-field entry to use the named values.
**Where**:

- `apps/api/src/modules/channel/core/plugin/channel-credential-field-type.ts` (edit in place)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts` (edit — 6 manifest entries + import)
- `apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts` (edit — 2 entries + import)

**Depends on**: T1
**Reuses**: `verification-token.ts` template.
**Requirement**: ENUM-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `channel-credential-field-type.ts` exports `ChannelCredentialFieldType`
      as both const object and derived type; preserves the existing JSDoc.
- [ ] `meta-whatsapp.plugin.ts` manifest entries on lines 60–64 + 70 use
      `ChannelCredentialFieldType.Text` / `.Secret`.
- [ ] `fake-channel-plugin.ts` entries on lines 29–30 use the named values.
- [ ] Plugin-spec assertion on `type: 'text'` (line 143) stays literal.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: existing unit tests pass; no deletions.

**Tests**: none (refactor)
**Gate**: quick

**Verify**:

```
rg -n "type: '(text|secret)'" apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts \
  apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts
# Expected: no matches outside __test__ files asserting on wire payload
bun test:unit
```

**Commit**: `refactor(api): promote ChannelCredentialFieldType to const-object (feature 032)`

---

### T5: Promote `ChannelCapability` to const-object [P]

**What**: Convert the bare-union in `channel-capability.ts` to const-object +
derived type. Update both manifest declarations to use the named values.
**Where**:

- `apps/api/src/modules/channel/core/plugin/channel-capability.ts` (edit in place)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts` (edit — capabilities array + import)
- `apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts` (edit — capabilities array + import)

**Depends on**: T1
**Reuses**: `verification-token.ts` template.
**Requirement**: ENUM-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `channel-capability.ts` exports `ChannelCapability` as both const object
      and derived type; preserves the existing JSDoc.
- [ ] `meta-whatsapp.plugin.ts` line 57 reads
      `capabilities: [ChannelCapability.Freeform, ChannelCapability.Template]`.
- [ ] `fake-channel-plugin.ts` line 26 mirrors the same pattern.
- [ ] Plugin-spec assertion on `['freeform', 'template']` (line 28 / line 43)
      stays literal.
- [ ] The `mode: 'freeform' | 'template'` fields in `channel-decision.ts` /
      `send-payload.ts` are NOT touched (out of scope per design.md).
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: existing unit tests pass; no deletions.

**Tests**: none (refactor)
**Gate**: quick

**Verify**:

```
rg -n "'(freeform|template|media)'" apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts \
  apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts
# Expected: only inside the deliberately-untouched `mode` literals
bun test:unit
```

**Commit**: `refactor(api): promote ChannelCapability to const-object (feature 032)`

---

### T6: `bun check` gate (full)

**What**: Run the full quality gate; iterate fixes until green.
**Where**: Repo root.
**Depends on**: T2, T3, T4, T5
**Reuses**: `scripts/check.sh` orchestration.
**Requirement**: ENUM-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `bun check` exits 0 (typecheck + `bunx vp check` lint/format/tests +
      `check-import-depth.ts` + `check-zod-v4.ts` + `check-drizzle-schema-naming.ts`
      + `drizzle-checksums.ts verify`).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.
- [ ] Test count from `bun test:unit && bun test:integration && bun test:e2e`
      matches the pre-refactor baseline (no silent deletions).

**Tests**: integration + e2e (full gate)
**Gate**: full

**Verify**:

```
bun check
CI=1 bunx vp lint
```

**Commit**: (none — gate task; commits land on T2–T5)

---

### T7: `thermo-nuclear-code-quality-review` on branch diff

**What**: Invoke the strict-maintainability skill against the branch diff. Apply
every structural fix it raises (not just cosmetic). Re-run `bun check`.
**Where**: Branch `feat/enum-vocabulary-rule`.
**Depends on**: T6
**Reuses**: `thermo-nuclear-code-quality-review` skill.
**Requirement**: AGENTS.md flow step 6

**Tools**:

- MCP: NONE
- Skill: `thermo-nuclear-code-quality-review`

**Done when**:

- [ ] Skill runs; every raised finding is either fixed or has a written one-line
      rebuttal in the PR description.
- [ ] `bun check` re-runs green after fixes.

**Tests**: none (review)
**Gate**: full (re-run after fixes)

**Verify**: Skill output captured; `bun check` exit 0.

---

### T8: `review-and-ship` → PR + `ci-watcher` → squash-merge

**What**: Final correctness/intent review via the skill; commit, push, open PR
against `master` with the rule + ADR-002 cited; watch CI; `fix-ci` if anything
goes red; squash-merge once green.
**Where**: Branch → PR → `master`.
**Depends on**: T7
**Reuses**: `review-and-ship` + `ci-watcher` + `fix-ci` skills.
**Requirement**: AGENTS.md flow steps 8–11

**Tools**:

- MCP: NONE
- Skill: `review-and-ship`, `ci-watcher`, `fix-ci`

**Done when**:

- [ ] PR opened against `master` with description quoting the rule and ADR-002.
- [ ] CI (the `Required (CI)` aggregator) is green.
- [ ] Squash-merged to `master`; branch deleted.
- [ ] ROADMAP.md / STATE.md updated (Lessons entry: rule landed + 4 refactors).

**Tests**: full CI
**Gate**: full

**Verify**: `gh pr view --json mergedAt,state` shows merged.

---

## Parallel Execution Map

```
Phase 1 (sequential):
  T1 (rule + AGENTS.md index)

Phase 2 (parallel after T1):
  ├── T2 [P]  promote MetaSubscriptionStep
  ├── T3 [P]  promote MetaConnectStep
  ├── T4 [P]  promote ChannelCredentialFieldType
  └── T5 [P]  promote ChannelCapability

Phase 3 (sequential):
  T6 (bun check) ──→ T7 (thermo-nuclear) ──→ T8 (review-and-ship → PR → merge)
```

Each [P] task touches a disjoint file set (different domain files; no shared
mutable state). Gate is `bun test:unit` per task — parallel-safe (unit tests run
in isolated workers, per TESTING.md).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: rule file + AGENTS.md index entry | 1 new file + 1 line in another | ✅ Granular |
| T2: promote `MetaSubscriptionStep` | 1 new file + 2 edits in 2 files | ✅ Granular (cohesive: one type's promotion) |
| T3: promote `MetaConnectStep` | 1 new file + 2 edits in 2 files | ✅ Granular |
| T4: promote `ChannelCredentialFieldType` | 3 edits, all on one type | ✅ Granular |
| T5: promote `ChannelCapability` | 3 edits, all on one type | ✅ Granular |
| T6: `bun check` gate | 1 verification | ✅ Granular |
| T7: thermo-nuclear review | 1 skill run + fixes | ✅ Granular |
| T8: ship + watch + merge | 1 PR lifecycle | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T1 | T1 → T5 | ✅ |
| T6 | T2, T3, T4, T5 | T2–T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |

All match.

---

## Test Co-location Validation

| Task | Code layer | Matrix requires | Task says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | rule doc | none | none | ✅ |
| T2 | refactor (no new code path; existing unit tests cover) | none (refactor of typed identifier; runtime string unchanged) | none | ✅ |
| T3 | refactor | none | none | ✅ |
| T4 | refactor | none | none | ✅ |
| T5 | refactor | none | none | ✅ |
| T6 | gate | full | full | ✅ |
| T7 | gate | full | full | ✅ |
| T8 | gate (CI) | full | full | ✅ |

**Rationale for `Tests: none` on T2–T5**: Per TESTING.md test-authoring policy,
thin orchestration / passthrough is covered by existing E2E. These four
refactors do not create new code paths — they replace string-literal identifiers
at call sites with named values that compile to the same string at runtime. The
existing unit tests (plugin/exception specs) already assert on the wire-emitted
literals; the refactor is value-preserving and `bun check` is the gate.
**Per `generate-tests` thin/fat classification**: no new behavior → no new tests.

---

## Tools and skills

- **Rule file (T1)**: hand-written, no skill (the rule itself is a docs artifact).
- **Refactors (T2–T5)**: hand-edited; no skill required — mechanical scope.
- **Gate (T6)**: `bun check` shell.
- **Quality review (T7)**: `thermo-nuclear-code-quality-review` skill.
- **Ship (T8)**: `review-and-ship` → `ci-watcher` → `fix-ci` (per AGENTS.md flow steps 8–10).

No MCPs needed for any task.
