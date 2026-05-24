# 044 — Resource Dialog Migration Tasks

**Design**: `.specs/features/044-resource-dialog-migration/design.md`
**Spec**: `.specs/features/044-resource-dialog-migration/spec.md`
**Status**: Draft → Approved on Execute kick-off.

---

## Execution Plan

### Phase 1: Primitive enhancements (sequential, blocking)

T1 → T2 → T3 (T2 + T3 depend on T1 because they use `Button.loading`;
T3 depends on T2 because `DeleteResourceDialog` composes
`ResourceDialog` and inherits the new `size` semantics by leaving
default).

### Phase 2: Migrations (sequential, one per logical surface)

After Phase 1, every migration task is `[P]`-eligible by code
boundary (touches its own folder under `routes/_app/`). Because this
PR is driven by a single orchestrator that executes tasks one at a
time (sub-agent delegation is overkill for the per-call-site
mechanical migration), they run sequentially in the listed order so
that a green `bun check` is preserved between commits. The order is
chosen by risk (smaller surface first, builds confidence and a
canonical reference for later migrations).

T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13

### Phase 3: Verification & ship

T14 → T15

```
Phase 1 (sequential, foundation):
  T1 → T2 → T3

Phase 2 (sequential, vertical slices — [P]-eligible if delegated):
  T4 [P] → T5 [P] → T6 [P] → T7 [P] → T8 [P] → T9 [P] → T10 [P] → T11 [P] → T12 [P] → T13 [P]

Phase 3 (sequential):
  T14 → T15
```

---

## Task Breakdown

### T1: Add `loading` prop to `Button` primitive

**What**: Extend `Button` to accept `loading?: boolean`; render Phosphor `Spinner` (animate-spin) before children when truthy; treat `loading` as `disabled` (OR with caller's `disabled`).
**Where**: `apps/web/src/components/primitives/button.tsx` (modify); `apps/web/src/components/primitives/__test__/button.spec.tsx` (new).
**Depends on**: None.
**Reuses**: existing `buttonVariants`, existing `[&_svg]:size-4` SVG sizing in the CVA base classes; Phosphor `Spinner` (already imported in `apps/web/src/components/primitives/sonner.tsx`).
**Requirement**: RDM-PRIM-01.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (web jsdom unit tests)

**Done when**:
- [ ] `Button` accepts `loading?: boolean`; default `false`; backward-compatible (existing call sites unaffected).
- [ ] When `loading` is true: spinner renders, `disabled` is true.
- [ ] When `loading` is false: zero behavior change vs. before.
- [ ] Component body still under 30 lines (per `code-standards.md` §10).
- [ ] Tests authored via `generate-tests` and pass under `bunx vp test --project web`.
- [ ] Gate check passes: `bun typecheck && bunx vp lint && bunx vp test --project web`.

**Tests**: web (jsdom — Button is fat: branches on `loading` and combines with `disabled`).
**Gate**: quick (typecheck + lint + web test project).

**Commit**: `feat(web): add loading prop to Button primitive`

**Verify**:
- `bun typecheck` clean.
- `bunx vp test --project web` shows Button tests passing.
- Visual check (any existing `<Button loading={true}>` mount via storybook-ish ad-hoc render or via T2's ResourceDialog test):
  - Spinner present, button disabled.

---

### T2: Enhance `ResourceDialog` (size prop + Button loading)

**What**: Add `size?: 'md' | 'lg'` prop (default `'md'`); wider on `lg` via `sm:max-w-lg`; switch the action button to use `loading={isPending}` (drop the `?'Working…':actionLabel` ternary).
**Where**: `apps/web/src/components/composed/resource-dialog.tsx` (modify); `apps/web/src/components/composed/__test__/resource-dialog.spec.tsx` (new).
**Depends on**: T1.
**Reuses**: enhanced `Button`, existing `Dialog*` primitives, `cn` helper.
**Requirement**: RDM-PRIM-04, RDM-PRIM-05.

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `ResourceDialog` accepts `size?: 'md' | 'lg'`; default `'md'`.
- [ ] `size="lg"` adds `sm:max-w-lg` class to the `DialogContent`; `size="md"` (default) keeps `sm:max-w-md`.
- [ ] Action button no longer renders `'Working…'`; renders `actionLabel` always and `loading={isPending}` for the spinner.
- [ ] Cancel button stays `disabled={isPending}`.
- [ ] Tests: open/close, size class applied, action button disabled + spinning when `isPending`, calls `onAction` (non-form path) and submits via `form={formId}` (form path).
- [ ] Gate check passes: `bun typecheck && bunx vp lint && bunx vp test --project web`.

**Tests**: web (fat — branches on `size`, `isPending`, `formId`).
**Gate**: quick.

**Commit**: `feat(web): add size prop and loading spinner to ResourceDialog`

---

### T3: Enhance `DeleteResourceDialog` (copy button + caseSensitive)

**What**: Render the resource name inside a copy button (Phosphor `Copy` ↔ `Check` flip, 1500ms revert); accept `caseSensitive?: boolean` (default `false`).
**Where**: `apps/web/src/components/composed/delete-resource-dialog.tsx` (modify); `apps/web/src/components/composed/__test__/delete-resource-dialog.spec.tsx` (new).
**Depends on**: T2 (compose).
**Reuses**: enhanced `ResourceDialog`, `FormError`, `Input`, `Label`, Phosphor `Copy` + `Check`.
**Requirement**: RDM-PRIM-02, RDM-PRIM-03, RDM-PRIM-06.

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] Resource name renders inside a `<button type="button">` with `Copy` icon (and the name text); click writes to clipboard and flips icon to `Check` for ~1500ms.
- [ ] `caseSensitive` prop accepted; default `false` (existing behavior); when `true`, only exact case match enables action.
- [ ] Confirmation input resets to empty AND copy-state resets to `false` when dialog closes (extend existing `useEffect`).
- [ ] If the file exceeds 50 lines, extract the copy button into a tiny `<NameCopyButton>` local helper in the same file (per `react.md` §9 + `code-standards.md` §11 — one type per file unless tightly cohesive).
- [ ] Tests (fat): typed-name guard (case-insensitive default + case-sensitive opt-in); copy button writes to clipboard and flips icon; reset on close; calls `onDelete` only when confirmed.
- [ ] Gate check passes: `bun typecheck && bunx vp lint && bunx vp test --project web`.

**Tests**: web (fat — branches: confirmation match, case sensitivity, copy state, reset).
**Gate**: quick.

**Commit**: `feat(web): add copy button and caseSensitive option to DeleteResourceDialog`

---

### T4: Migrate Channels → dialog (RDM-01 + RDM-02)

**What**: Replace `ChannelsManager`'s two inline create cards with `PageHeader` actions that open dialogs. Move `useCreateChannelAccount` + `useGrantChannelAccess` from the form files into new dialog wrappers; make `ChannelAccountForm` and `GrantChannelAccessForm` dumb.
**Where**:
- Modify: `apps/web/src/routes/_app/settings/channels.tsx` (PageHeader actions + dialog open state).
- Modify: `apps/web/src/routes/_app/settings/-components/channels/channels-manager.tsx` (collapse to just the accounts table).
- Modify: `apps/web/src/routes/_app/settings/-components/channels/channel-account-form.tsx` (strip hook, accept `{formId,isPending,onSubmit,error,defaultValues?}`).
- Modify: `apps/web/src/routes/_app/settings/-components/channels/grant-channel-access-form.tsx` (same).
- New: `apps/web/src/routes/_app/settings/-dialogs/create-channel-account-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/grant-channel-access-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `ResourceDialog size="lg"`, `FormError`, `getApiErrorMessage`, `toast`.
**Requirement**: RDM-01, RDM-02.

**Tools**:
- MCP: NONE
- Skill: NONE (Chrome smoke verifies; thin orchestration per TESTING.md row "Web components / hooks (thin) → none — browser e2e covers them").

**Done when**:
- [ ] `PageHeader` on `/settings/channels` has two actions: primary `+ Add channel account`, secondary `Grant access`.
- [ ] Clicking either opens its respective dialog hosting the corresponding (now-dumb) form; submit invokes the create mutation; success → dialog closes + `toast.success(...)`.
- [ ] On error: `FormError` renders inside the dialog body (NOT a toast); dialog stays open.
- [ ] `ChannelAccountForm` and `GrantChannelAccessForm` no longer import any `useCreate*` / `useGrant*` hooks; the dumb-form props are present.
- [ ] No always-on inline `<form>` remains in `channels-manager.tsx`.
- [ ] `bun check` green; CI=1 lint clean.

**Tests**: none for the per-page wiring (thin). Chrome smoke per criterion.
**Gate**: build (`bun check`).

**Commit**: `feat(web): migrate channels create/grant flows to ResourceDialog (RDM-01, RDM-02)`

**Verify**:
- Chrome smoke: navigate `/settings/channels` → click "+ Add channel account" → fill form → submit → dialog closes, toast shows, table updates. Click "Grant access" → fill form → submit → dialog closes, toast shows.

---

### T5: Migrate Connectors → dialog (RDM-03 + RDM-04 + RDM-05)

**What**: Same recipe as T4 for the Connectors page: dialog-trigger for `ConnectorAccountForm` and `EntryTriggerForm`; `DeleteResourceDialog` for entry-trigger delete.
**Where**:
- Modify: `apps/web/src/routes/_app/settings/connectors.tsx`.
- Modify: `apps/web/src/routes/_app/settings/-components/connectors/connectors-manager.tsx`.
- Modify: `apps/web/src/routes/_app/settings/-components/connectors/connector-account-form.tsx` (dumb).
- Modify: `apps/web/src/routes/_app/settings/-components/connectors/entry-trigger-form.tsx` (dumb).
- Modify: `apps/web/src/routes/_app/settings/-components/connectors/entry-triggers-table.tsx` (row → `DropdownMenu` with "Remove"; lift `deleting` state).
- New: `apps/web/src/routes/_app/settings/-dialogs/create-connector-account-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/create-entry-trigger-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/delete-entry-trigger-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `ResourceDialog size="lg"`, `DeleteResourceDialog`, `DropdownMenu`, `getApiErrorMessage`, `toast`.
**Requirement**: RDM-03, RDM-04, RDM-05.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] `/settings/connectors` has primary `+ Add CRM connector` (PageHeader) and per-card `+ Add entry trigger` (entry triggers Card header).
- [ ] Entry-trigger table rows use a dropdown menu trigger with a "Remove" item that opens a `DeleteResourceDialog` (resourceType=`"entry trigger"`, resourceName=`"<stageName> → <cadenceName>"`).
- [ ] Forms are dumb; dialog wrappers own mutation hooks.
- [ ] On revoke success → dialog closes, toast shows, table refreshes (existing invalidation).
- [ ] `bun check` green.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): migrate connectors create/delete flows to dialogs (RDM-03..05)`

---

### T6: Migrate Members → dialog (RDM-06 + RDM-07 + RDM-08)

**What**: Invite via `ResourceDialog`; deactivate + pause-journeys via lightweight `ResourceDialog tone="destructive"` (no typed-name) from a row dropdown menu.
**Where**:
- Modify: `apps/web/src/routes/_app/settings/members.tsx`.
- Modify: `apps/web/src/routes/_app/settings/-components/members/invite-member-form.tsx` (dumb).
- Modify: `apps/web/src/routes/_app/settings/-components/members/members-table.tsx` (row menu actions: Deactivate, Activate, Pause journeys).
- Modify: `apps/web/src/routes/_app/settings/-components/members/member-row.tsx` (drop inline buttons; use menu).
- New: `apps/web/src/routes/_app/settings/-dialogs/invite-member-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/deactivate-member-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/pause-owner-journeys-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `ResourceDialog`, `DropdownMenu`, `getApiErrorMessage`, `toast`.
**Requirement**: RDM-06, RDM-07, RDM-08.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] Members PageHeader has primary `+ Invite member` action.
- [ ] Invite dialog: on success the dialog does NOT auto-close — it surfaces the invitation token in its body for the user to copy; "Close" button dismisses (per design's decision row).
- [ ] Member row has a dropdown menu with Deactivate / Activate / Pause journeys items (Activate stays one-click — no confirmation per design).
- [ ] Deactivate + Pause journeys each open a `ResourceDialog tone="destructive"` with clear body copy ("Deactivate <name>? They will no longer …").
- [ ] On success → dialog closes, toast shows, table updates.
- [ ] `bun check` green.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): migrate members invite/deactivate/pause flows to dialogs (RDM-06..08)`

---

### T7: Migrate Security → dialog (RDM-09 + RDM-10)

**What**: Revoke single session → `DeleteResourceDialog` (resourceType=`"session"`, resourceName=`session.userAgent ?? 'Unknown device'`). Revoke all other sessions → `ResourceDialog tone="destructive"` (no typed-name).
**Where**:
- Modify: `apps/web/src/routes/_app/settings/-components/security/sessions-manager.tsx` (hold `revoking` + `confirmingRevokeAll` state; render dialogs as siblings).
- Modify: `apps/web/src/routes/_app/settings/-components/security/sessions-table.tsx` (row trigger sets `revoking`).
- Modify: `apps/web/src/routes/_app/settings/-components/security/session-row.tsx` (drop direct `onRevoke`-as-mutation pass-through; emit a "request revoke" callback that the manager intercepts).
- New: `apps/web/src/routes/_app/settings/-dialogs/revoke-session-dialog.tsx`.
- New: `apps/web/src/routes/_app/settings/-dialogs/revoke-other-sessions-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `DeleteResourceDialog`, enhanced `ResourceDialog`.
**Requirement**: RDM-09, RDM-10.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] Clicking "Revoke" on a session row opens `DeleteResourceDialog`; typing the userAgent (case-insensitive) enables Revoke; success → dialog closes, row disappears.
- [ ] "Revoke other sessions" CardAction opens a `ResourceDialog tone="destructive"` with bulk-confirm copy; confirm → mutation fires, dialog closes, sessions refresh.
- [ ] Current session row still cannot be revoked (Badge "This device").
- [ ] `bun check` green.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): migrate session revoke flows to dialogs (RDM-09, RDM-10)`

---

### T8: Migrate Cadences delete (RDM-11)

**What**: Delete cadence via `DeleteResourceDialog` triggered from a row dropdown menu.
**Where**:
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/cadences-table.tsx` (row → dropdown menu with Remove; lift `deleting` state).
- New: `apps/web/src/routes/_app/workspace/-dialogs/delete-cadence-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `DeleteResourceDialog`, `DropdownMenu`, `getApiErrorMessage`, `toast`.
**Requirement**: RDM-11.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] Cadence row exposes a dropdown menu with "Remove"; clicking opens `DeleteResourceDialog resourceType="cadence" resourceName=cadence.name`.
- [ ] Confirmed → mutation fires, dialog closes, table refreshes, toast shows.
- [ ] `bun check` green.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): migrate cadence delete to DeleteResourceDialog (RDM-11)`

---

### T9: Migrate Templates create + delete (RDM-12 + RDM-13)

**What**: Templates tab gets `+ New template` action that opens a `ResourceDialog` hosting the (now-dumb) `TemplateForm`; row delete uses `DeleteResourceDialog`.
**Where**:
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/cadence-templates-view.tsx` (per-tab action + dialog state).
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/template-form.tsx` (dumb).
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/templates-table.tsx` (row → dropdown menu with Remove).
- New: `apps/web/src/routes/_app/workspace/-dialogs/create-template-dialog.tsx`.
- New: `apps/web/src/routes/_app/workspace/-dialogs/delete-template-dialog.tsx`.
**Depends on**: T3.
**Reuses**: enhanced `ResourceDialog size="lg"`, enhanced `DeleteResourceDialog`, `DropdownMenu`.
**Requirement**: RDM-12, RDM-13.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] Templates tab has `+ New template` action that opens a dialog hosting `TemplateForm`.
- [ ] Template row dropdown menu has "Remove" that opens `DeleteResourceDialog resourceType="template" resourceName=template.name`.
- [ ] Submit/Confirm success → dialog closes + toast + invalidation.
- [ ] `bun check` green.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): migrate templates create/delete to dialogs (RDM-12, RDM-13)`

---

### T9.5: Migrate Cadence create → dialog (RDM-14)

**What**: `CadenceBuilder` becomes a dumb form (strip `useCreateCadence`, accept `{formId,isPending,onSubmit,error,defaultValues?}`); cadences tab gains `+ New cadence` action; new `CreateCadenceDialog` (`ResourceDialog size="lg"`) owns the mutation + side-effects.
**Where**:
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/cadence-templates-view.tsx` (per-tab `+ New cadence` action + dialog open state).
- Modify: `apps/web/src/routes/_app/workspace/-components/cadences/cadence-builder.tsx` (drop the hook; wrap JSX in `<form id={formId}>`; expose dumb-form props).
- New: `apps/web/src/routes/_app/workspace/-dialogs/create-cadence-dialog.tsx`.
**Depends on**: T9 (templates have the same view-file edit; sequence avoids merge churn).
**Reuses**: enhanced `ResourceDialog size="lg"`, `getApiErrorMessage`, `toast`. Builder internals (steps editor, pickers) unchanged.
**Requirement**: RDM-14.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] Cadences tab no longer renders an always-on `CadenceBuilder` card; instead the tab header has `+ New cadence` that opens a dialog hosting the builder.
- [ ] `cadence-builder.tsx` no longer imports `useCreateCadence`; props match the dumb-form contract.
- [ ] Builder JSX is wrapped in `<form id={formId} onSubmit={...}>`; submit calls `onSubmit(buildCadenceRequest(...))`.
- [ ] Submit success → dialog closes, toast shows, table refreshes.
- [ ] Steps editor remains usable inside the dialog (Chrome smoke confirms — if obviously cramped, file a follow-up to promote to a dedicated route).
- [ ] `bun check` green.

**Tests**: none for wiring (thin). The builder's `buildCadenceRequest` helper already has unit tests (`build-cadence-request.spec.ts`); those continue to pass.
**Gate**: build.

**Commit**: `feat(web): migrate cadence builder to ResourceDialog size=lg (RDM-14)`

**Verify**:
- Chrome smoke: `/workspace/cadences` → click `+ New cadence` → fill name + channel + add 2 step rows → submit → dialog closes, toast, new row in table.
- If steps editor feels visually cramped at `sm:max-w-lg`: still ship (acceptance is "usable", not "as spacious as full page"); log a follow-up in STATE.md.

---

### T10: Cleanup pass — dead `Card`s + remove orphaned imports

**What**: After T4–T9.5, walk the diff and remove now-empty `<Card>` wrappers from managers, fix imports, ensure each manager renders only its (table + dialogs) — no leftover headers from the inline-form era.
**Where**:
- `apps/web/src/routes/_app/settings/-components/channels/channels-manager.tsx`
- `apps/web/src/routes/_app/settings/-components/connectors/connectors-manager.tsx`
- `apps/web/src/routes/_app/settings/-components/members/members-manager.tsx` (if present)
- `apps/web/src/routes/_app/settings/-components/security/sessions-manager.tsx`
- `apps/web/src/routes/_app/workspace/-components/cadences/cadence-templates-view.tsx`
**Depends on**: T9.5.
**Reuses**: existing `PageHeader`, `Card` only where genuinely a card (e.g., the sessions list grouping).
**Requirement**: indirect; supports all P1 stories' "no inline always-on CRUD forms remain" success criterion.

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] No `<Card><CardHeader>...</CardHeader><CardContent><Form .../></CardContent></Card>` pattern remains for migrated flows.
- [ ] No unused imports in any modified manager/table.
- [ ] `bun check` green.

**Tests**: none.
**Gate**: build.

**Commit**: `refactor(web): drop dead Card wrappers from migrated managers`

---

### T11: Audit destructive call-sites

**What**: Run the success-criteria audit grep — every destructive mutation hook call in `apps/web` must originate from inside a dialog's `onAction`/`onDelete`, not a bare button `onClick`.
**Where**: read-only audit; raise any missed call-site as a follow-up commit (would split into a new task if found).
**Depends on**: T10.
**Reuses**: success-criteria checklist from `spec.md`.
**Requirement**: success criteria audit.

**Tools**:
- Bash `grep`.
- Skill: NONE.

**Done when**:
- [ ] `grep -rn "deleteCadence\|deleteTemplate\|deleteEntryTrigger\|revokeSession\|revokeOtherSessions\|updateMemberStatus\|pauseOwnerJourneys" apps/web/src/routes/_app/` shows every match inside a `-dialogs/` file.
- [ ] Any miss is fixed by appending a small task (T11.X) and re-running.

**Tests**: none.
**Gate**: build (`bun check` after any fix).

**Commit**: only if a fix is needed: `fix(web): route <hook> through DeleteResourceDialog`.

---

### T12: Generate any missing primitive tests via `generate-tests`

**What**: Invoke the `generate-tests` skill on the three enhanced primitives (Button, ResourceDialog, DeleteResourceDialog) — confirm coverage of the fat behavior added in T1/T2/T3 and add anything the skill says is missing.
**Where**:
- `apps/web/src/components/primitives/__test__/button.spec.tsx`
- `apps/web/src/components/composed/__test__/resource-dialog.spec.tsx`
- `apps/web/src/components/composed/__test__/delete-resource-dialog.spec.tsx`
**Depends on**: T11 (so the audit doesn't churn the files).
**Reuses**: tests authored alongside T1–T3; this task verifies completeness via the skill, not from scratch.
**Requirement**: spec success criteria — "new primitive tests cover the confirmation guard and copy button".

**Tools**:
- Skill: `generate-tests`.

**Done when**:
- [ ] `generate-tests` confirms the primitives' fat behavior is fully covered OR adds the missing tests.
- [ ] `bunx vp test --project web` green.

**Tests**: web (fat — already authored; this task is the audit pass).
**Gate**: quick.

**Commit**: only if `generate-tests` adds anything: `test(web): expand primitive dialog tests per generate-tests audit`.

---

### T13: Update `STATE.md` and `ROADMAP.md`

**What**: Record the migration outcome (decisions made, what stayed inline and why) in `.specs/project/STATE.md`; flip `ROADMAP.md` row for feature 044 from `IN PROGRESS` to `COMPLETE` with a one-liner summary.
**Where**:
- `.specs/project/STATE.md`
- `.specs/project/ROADMAP.md`
**Depends on**: T12.
**Reuses**: existing STATE/ROADMAP format.
**Requirement**: spec success criteria — "STATE.md updated; ROADMAP.md row flips".

**Tools**:
- MCP: NONE
- Skill: NONE.

**Done when**:
- [ ] STATE.md has an entry under Decisions (or Lessons) summarizing the dialog migration and the kept-inline exceptions (CadenceBuilder, profile pages, Coex flow).
- [ ] ROADMAP.md row says `COMPLETE` with a brief landed-summary similar to 041–043.
- [ ] `bun check` green (docs-only, but verify).

**Tests**: none.
**Gate**: build.

**Commit**: `docs: mark feature 044 (resource dialog migration) complete`

---

### T14: `thermo-nuclear-code-quality-review`

**What**: Run the strict maintainability audit on the branch diff; fix every issue raised (not just cosmetic).
**Where**: branch diff.
**Depends on**: T13.
**Reuses**: skill `thermo-nuclear-code-quality-review`.
**Requirement**: AGENTS.md step 6.

**Tools**:
- Skill: `thermo-nuclear-code-quality-review`.

**Done when**:
- [ ] Skill output reviewed; every raised issue addressed in a focused commit.
- [ ] `bun check` re-runs green after fixes.

**Tests**: per-fix as needed.
**Gate**: build.

**Commit**: per fix, conventional commits.

---

### T15: Ship via `review-and-ship`; CI watch + fix loop

**What**: Final correctness/regression/intent review, push, open or update PR vs master; watch CI; fix until green; squash to master.
**Where**: git + GitHub.
**Depends on**: T14.
**Reuses**: skills `review-and-ship`, `ci-watcher`, `fix-ci`.
**Requirement**: AGENTS.md steps 8–11.

**Tools**:
- Skill: `review-and-ship`, then `ci-watcher`, then `fix-ci` (if needed).

**Done when**:
- [ ] PR open against `master` with verification notes.
- [ ] All CI checks pass (`Required (CI)`).
- [ ] Squash-merged to `master`; branch deleted.

**Tests**: CI.
**Gate**: CI green.

**Commit**: PR title `feat(web): migrate inline CRUD surfaces to ResourceDialog (feature 044)`.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Button loading prop | 1 component + 1 test file | ✅ |
| T2: ResourceDialog size + spinner | 1 component + 1 test file | ✅ |
| T3: DeleteResourceDialog copy + caseSensitive | 1 component + 1 test file | ✅ |
| T4: Channels migration | 2 dumbened forms + 2 new dialogs + 1 manager + 1 page | ⚠️ 6 files but tight vertical slice — kept as one to avoid mid-state where dumbened forms have no callers; commit atomically |
| T5: Connectors migration | 2 dumbened forms + 3 new dialogs + 1 manager + 1 page + 1 table | ⚠️ Same — atomic vertical slice |
| T6: Members migration | 1 dumbened form + 3 new dialogs + 1 table + 1 row + 1 page | ⚠️ Same — atomic vertical slice |
| T7: Security migration | 2 new dialogs + 1 manager + 1 table + 1 row | ⚠️ Same — atomic vertical slice |
| T8: Cadences delete | 1 new dialog + 1 table | ✅ |
| T9: Templates create+delete | 1 dumbened form + 2 new dialogs + 1 table + 1 view | ⚠️ Same — atomic vertical slice |
| T10: Cleanup pass | 3–4 managers, mechanical | ✅ |
| T11: Audit grep | read-only | ✅ |
| T12: Generate-tests audit | 3 test files | ✅ |
| T13: Docs update | 2 markdown files | ✅ |
| T14: Quality review | branch diff | ✅ |
| T15: Ship + CI | git/GitHub | ✅ |

The ⚠️ vertical-slice tasks (T4–T9 mostly) are kept large on purpose: a half-migrated state (form dumbened but no dialog wrapper) is broken; the slice must commit atomically. This is the standard pattern from `web-patterns.md` §6 — the page/dialog/form are co-changed.

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram arrows | Status |
| ---- | ----------------- | -------------- | ------ |
| T1 | none | none → T1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T3 | T3 → T5 (via T4 chain order) | ✅ |
| T6 | T3 | T3 → T6 (via T4–T5 chain order) | ✅ |
| T7 | T3 | T3 → T7 (chain) | ✅ |
| T8 | T3 | T3 → T8 (chain) | ✅ |
| T9 | T3 | T3 → T9 (chain) | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |

The chain T4 → T5 → … → T9 is a serial execution order chosen by the orchestrator (single-agent run); each task technically depends only on T3, not on its predecessor in the chain. They are `[P]`-eligible in a parallel-delegated execution; here we run them in order to keep `bun check` green between commits.

---

## Test Co-location Validation

Per `.specs/codebase/TESTING.md` Test Coverage Matrix:

| Task | Code layer | Matrix requires | Task says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 (Button loading) | Web fat logic (branching) | web (jsdom) | web | ✅ |
| T2 (ResourceDialog) | Web fat logic (branching) | web | web | ✅ |
| T3 (DeleteResourceDialog) | Web fat logic (branching + timer + clipboard) | web | web | ✅ |
| T4–T9 (page wiring) | Web thin orchestration | none (browser e2e covers it) | none | ✅ |
| T10 (cleanup) | Web thin orchestration | none | none | ✅ |
| T11 (audit) | read-only | none | none | ✅ |
| T12 (generate-tests audit) | Web fat (verification) | web | web | ✅ |
| T13 (docs) | docs | none | none | ✅ |
| T14 (quality review) | review only | per-fix | per-fix | ✅ |
| T15 (ship) | CI | CI green | CI green | ✅ |

No violations.

---

## Parallel Execution Map

```
Phase 1 (sequential, foundation):
  T1 → T2 → T3

Phase 2 (sequential by orchestrator choice; [P]-eligible if delegated):
  T3 ┬→ T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9
     │  (all [P]-eligible — independent route folders)
     └ … run serial to keep gate green between commits

Phase 3 (sequential):
  T9 → T10 → T11 → T12 → T13 → T14 → T15
```

If executed via sub-agent delegation, T4–T9 fan out in parallel after
T3, then T10 collects them. In this single-agent run, they run in
order.

---

## Tools per task (summary)

| Task | MCP | Skill |
| ---- | --- | ----- |
| T1 | — | generate-tests |
| T2 | — | generate-tests |
| T3 | — | generate-tests |
| T4–T10 | — | — |
| T11 | Bash grep | — |
| T12 | — | generate-tests |
| T13 | — | — |
| T14 | — | thermo-nuclear-code-quality-review |
| T15 | — | review-and-ship, ci-watcher, fix-ci |

---

## Status tracking

The `RDM-NN` IDs in spec.md flip:
- `Pending` → `In Tasks` when this file is written.
- `In Tasks` → `Implementing` when each task starts.
- `Implementing` → `Verified` when the per-task Done When + Chrome smoke pass.

Update the spec.md table as we go (or batch the flips in T13 with the
docs update).
