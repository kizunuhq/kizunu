# 044 — Resource Dialog Migration Specification

## Problem Statement

Features 041–043 landed the web doctrine (ADR-007, `web-patterns.md` §6):
**create/edit/delete of discrete resources go through `ResourceDialog` /
`DeleteResourceDialog`**, with a trigger button in the page header (or a
row-action menu) instead of an always-on form embedded in a Card. The
primitives exist (`apps/web/src/components/composed/resource-dialog.tsx`,
`delete-resource-dialog.tsx`, `form-error.tsx`) but **no feature has been
migrated to use them** — every settings and workspace surface still uses
inline `<Card>` + form, and every destructive action calls its mutation
hook with no confirmation guard.

A peer project (hoxus, `/Users/nothing/Workspaces/hoxus/apps/web/src/components/dialogs/`)
ships richer versions of the same primitives with UX wins worth porting:
a copy-to-clipboard button on the resource name in the delete dialog
(CheckIcon ↔ CopyIcon flip), a `loading` spinner on the action button,
a wider modal suited for multi-field forms, and an opt-in
`caseSensitive` confirmation. None of these exist in kizunu yet.

This feature lands **both halves** in one PR: enhance the primitives,
then migrate every inline CRUD call-site in `apps/web` to use them.

## Goals

- [ ] **Primitives polished**: `Button` gains a `loading` prop (Phosphor
  `CircleNotch` + `animate-spin`); `DeleteResourceDialog` gains a
  copy-to-clipboard button on the resource name and an optional
  `caseSensitive` (default `false`); `ResourceDialog` gains an optional
  `size` prop (`'md' | 'lg'`, default `'md'`) so multi-field forms can opt
  into a wider modal (`sm:max-w-lg`).
- [ ] **All identified inline create forms** are migrated to
  trigger-button → `ResourceDialog` per `web-patterns.md` §6: the page
  owns `open` state and the mutation hook; the form is dumb and receives
  `{ formId, isPending, onSubmit, error }`; submit happens on the dialog
  action button via `form={formId}`.
- [ ] **All identified destructive actions** (delete / revoke / remove)
  go through `DeleteResourceDialog` with typed-name confirmation; bulk
  destructive actions (no single resource name) use `ResourceDialog`
  with `tone="destructive"` and an explicit confirm body.
- [ ] **Reversible status toggles** (member activate/deactivate, pause
  owner journeys) get a lightweight `ResourceDialog` confirmation when
  the action is meaningful (deactivate, pause). Set-primary-channel
  stays one-click (low-risk, easily undone by setting another primary).
- [ ] `bun check` is green; existing web tests stay passing; new
  primitive tests cover the confirmation guard and copy button.
- [ ] Chrome smoke green on every migrated surface (open dialog → fill
  form → submit → see closed dialog + success + table updated; click
  destructive action → see typed-name guard → type name → confirm →
  see toast + row removed).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `CadenceBuilder` (`workspace/-components/cadences/cadence-builder.tsx`) | Multi-section in-page builder with `CadenceStepsEditor` — explicitly allowed to remain inline per `web-patterns.md` §6 ("for non-CRUD features … the `ResourceDialog` recipe is optional — this rule is a recipe book, not a straitjacket"). Edits later if a UAT shows the dialog form would actually fit. |
| `connect-meta-coex.tsx` (Meta Embedded Signup) | OAuth/SDK flow, not a CRUD dialog — script-loads FB SDK and posts a verified payload; full-page route is correct. |
| `profile.tsx`, `workspace.tsx`, `billing.tsx` | Page-as-display: render the user/workspace identity + external links (verify email, reset password). No discrete-resource CRUD widgets. |
| Auth surface (`/_auth/*` login/register/forgot/reset/accept-invite/oauth) | Page-as-form per ADR-007 §3; not resource CRUD. |
| Marketing routes (`routes/-marketing/`) | No resources to manage. |
| Brand-new UI for unwired mutations (`useRevokeChannelAccess`, `useUpdateCadence`, `useUpdateTemplate`) | Wiring a missing UI is a different feature. We migrate what exists; the unwired hooks are surfaced in the Edge Cases section so a follow-up can pick them up. |
| Replacing `toast.error` with `FormError` in action-only dialogs | The `web-patterns.md` §7 error-handling table is already followed: dialogs use `FormError`; action-only buttons use `toast.error`. We add `FormError` to the new dialogs; we don't sweep old `toast.error` sites. |
| `useSetPrimaryChannel` row action | Reversible / low-risk; staying one-click is appropriate. |
| Move-to-trash, soft-delete semantics | Hard-delete is the existing behavior; UX wrapper only. |

## User Stories

### P1: Primitive polish ⭐ MVP

**User Story**: As a user clicking a destructive action, I want to see
a clear typed-name guard with a copy button so I can verify the resource
name without retyping it, and a spinner on the action button so I know
the action is in flight.

**Why P1**: Every migrated delete site depends on these affordances.
Without the copy button, typing exact long names (UUIDs, emails) is
hostile; without the spinner, double-submits are easy.

**Acceptance Criteria**:

1. WHEN the developer adds `loading={true}` to `<Button>` THEN the
   button SHALL render a `CircleNotch` icon spinning in place of (or
   alongside) its children and SHALL be disabled while loading.
2. WHEN the developer renders `<DeleteResourceDialog resourceName="X">`
   THEN the dialog body SHALL render the resource name as a copy
   button; clicking the button SHALL write the name to the clipboard
   and flip the icon to `CheckIcon` for ~1.5s, then revert.
3. WHEN the developer passes `caseSensitive={true}` to
   `<DeleteResourceDialog>` THEN the confirmation match SHALL be
   case-sensitive; default (`caseSensitive={false}`) SHALL match
   case-insensitively (existing behavior).
4. WHEN the developer passes `size="lg"` to `<ResourceDialog>` THEN the
   modal SHALL widen to `sm:max-w-lg`; the default (`size="md"`) keeps
   the current `sm:max-w-md`.
5. WHEN a `ResourceDialog` is open and the mutation is in flight THEN
   the Cancel button SHALL be disabled, the action button SHALL show
   the spinner via the new `loading` prop, and clicking outside or
   pressing Escape SHALL be ignored.
6. WHEN the `DeleteResourceDialog` is closed (by Cancel, Escape, or
   completion) THEN the confirmation input SHALL reset to empty and the
   copy-state flag SHALL reset to `false` (already present;
   verification adds a test).

**Independent Test**: Storybook-style mount of each dialog in isolation;
toggle `loading`, `caseSensitive`, `size`; verify the visual states.

---

### P1: Settings CRUD migrations ⭐ MVP

**User Story**: As an admin on Settings → Channels (and Connectors,
Members, Security), I want create/edit/delete to feel like discrete,
deliberate actions — triggered by a clear button, surfaced in a focused
dialog, confirmed for destructive paths — instead of always-on forms
crowding the page.

**Why P1**: The doctrine (ADR-007) was paid for in features 041–043; v0.1
parity needs the UI to actually use it.

**Acceptance Criteria**:

1. **RDM-01 Channels: Add channel account.** WHEN the user navigates to
   `/settings/channels` THEN the page SHALL show a primary "Add channel
   account" button in the `PageHeader` actions (replacing the always-on
   form Card). WHEN the button is clicked THEN a `ResourceDialog`
   (`size="lg"`) SHALL open hosting `ChannelAccountForm`. WHEN submit
   succeeds THEN the dialog SHALL close, a success toast SHALL appear,
   and the channel-accounts table SHALL refresh (existing
   invalidation).
2. **RDM-02 Channels: Grant access.** WHEN the user clicks a "Grant
   access" button (PageHeader, secondary action OR a per-account-row
   menu) THEN a `ResourceDialog` SHALL open hosting
   `GrantChannelAccessForm`. WHEN submit succeeds THEN the dialog SHALL
   close and a success toast SHALL appear.
3. **RDM-03 Connectors: Add CRM connector.** Same pattern as RDM-01
   for `ConnectorAccountForm`.
4. **RDM-04 Connectors: Add entry trigger.** Same pattern as RDM-01
   for `EntryTriggerForm`. The trigger button SHALL live in the
   "Entry triggers" Card header (since it's secondary to the connector
   account itself).
5. **RDM-05 Connectors: Delete entry trigger.** WHEN the user clicks
   the per-row "Remove" action in `EntryTriggersTable` THEN a
   `DeleteResourceDialog` SHALL open with `resourceType="entry trigger"`
   and `resourceName` set to a human-readable composite
   (`<stageName> → <cadenceName>`). WHEN the user types the name and
   confirms THEN the row SHALL be removed and a success toast SHALL
   appear.
6. **RDM-06 Members: Invite member.** WHEN the user clicks "Invite
   member" in the Members `PageHeader` THEN a `ResourceDialog` SHALL
   open hosting `InviteMemberForm`. WHEN submit succeeds THEN the
   dialog SHALL close and the success surfaces the existing invitation
   token (kept inline as before).
7. **RDM-07 Members: Deactivate member.** WHEN the user clicks
   "Deactivate" on a member row THEN a `ResourceDialog`
   (`tone="destructive"`, no typed-name guard since reversible) SHALL
   open with body "Deactivate <name>? They will no longer be able to
   sign in." Activate stays one-click (low-risk).
8. **RDM-08 Members: Pause owner journeys.** WHEN the user clicks
   "Pause journeys" on a member row THEN a `ResourceDialog`
   (`tone="destructive"`, no typed-name guard) SHALL open with body
   "Pause all running journeys owned by <name>?" WHEN confirmed THEN
   the action SHALL fire and the toast SHALL surface the result count
   (existing behavior).
9. **RDM-09 Security: Revoke single session.** WHEN the user clicks
   "Revoke" on a session row THEN a `DeleteResourceDialog` SHALL open
   with `resourceType="session"`, `resourceName=session.userAgent ??
   'Unknown device'`. WHEN confirmed THEN the session SHALL be revoked
   and the row SHALL disappear.
10. **RDM-10 Security: Revoke all other sessions.** WHEN the user
    clicks "Revoke other sessions" THEN a `ResourceDialog`
    (`tone="destructive"`, no typed-name guard since bulk) SHALL open
    with body "Revoke every session except this one? You will stay
    signed in here." WHEN confirmed THEN the action SHALL fire and the
    sessions list SHALL refresh.

**Independent Test**: For each criterion, drive a Chrome session
(`/run` skill or manual): open page → click trigger → assert dialog
opens with correct title and form → submit → assert dialog closes /
toast appears / list refreshes.

---

### P1: Workspace CRUD migrations ⭐ MVP

**User Story**: As a workspace user on Cadences / Templates, I want
create and delete to feel deliberate the same way Settings does.

**Acceptance Criteria**:

1. **RDM-11 Cadences: Delete cadence.** WHEN the user clicks "Remove"
   on a cadence row THEN a `DeleteResourceDialog` SHALL open with
   `resourceType="cadence"`, `resourceName=cadence.name`. WHEN
   confirmed THEN the cadence SHALL be removed; a success toast SHALL
   appear; the cadences list SHALL refresh.
2. **RDM-12 Templates: Create template.** WHEN the user clicks "New
   template" in the templates tab `PageHeader` (or the templates Card
   header) THEN a `ResourceDialog` SHALL open hosting `TemplateForm`.
   WHEN submit succeeds THEN the dialog SHALL close and the templates
   list SHALL refresh.
3. **RDM-13 Templates: Delete template.** Mirror of RDM-11 for
   templates (`resourceType="template"`, `resourceName=template.name`).

**Independent Test**: Same as P1 Settings — Chrome session per
criterion.

---

### P1: Cadence create migration ⭐ MVP

**User Story**: As a workspace user, I want creating a cadence to feel
like the other resource creates — a trigger button that opens a focused
flow rather than always-on inline editing.

**Acceptance Criteria**:

1. **RDM-14 Cadences: Create cadence.** WHEN the user is on the
   cadences tab THEN the tab SHALL show a `+ New cadence` action that
   opens a `ResourceDialog size="lg"` hosting the (now-dumb)
   `CadenceBuilder`. WHEN submit succeeds THEN the dialog SHALL close,
   a success toast SHALL appear, and the cadences list SHALL refresh.
   The builder's internal complexity (multi-section form + steps
   editor) SHALL be preserved as-is; only its hook/submit wiring is
   externalized via the dumb-form contract (`{formId, isPending,
   onSubmit, error}`).

**Independent Test**: Chrome smoke — open `/workspace/cadences` →
click `+ New cadence` → fill the form including step rows → submit →
assert dialog closes / toast appears / new row in the cadences table.

---

## Edge Cases

- WHEN the mutation fails (network / 422 business rule / 500 infra)
  THEN the dialog SHALL stay open and SHALL render `<FormError>` inside
  the dialog body with `getApiErrorMessage(error)`; the action button
  SHALL re-enable. (Per `web-patterns.md` §7.)
- WHEN the user clicks the action button rapidly THEN the
  `useCallback`-memoized handler SHALL early-return when `isPending` is
  true (avoids duplicate submits even if the disabled state lags by a
  paint).
- WHEN `resourceName` contains uppercase letters and the caller doesn't
  set `caseSensitive` THEN typing a lowercase version SHALL still
  confirm; setting `caseSensitive={true}` SHALL require exact match.
- WHEN the user pastes the resource name (whether via the copy button
  or system clipboard) THEN the trimmed comparison SHALL match (existing
  `.trim()` on the input).
- WHEN the page is dismounted mid-mutation (route change, dialog close
  externally) THEN the open-state setter SHALL still fire on success and
  the toast SHALL still appear (TanStack Query keeps the mutation
  running unless the page is fully gone; we accept the existing
  behavior).
- WHEN any of the **unwired** mutation hooks (`useRevokeChannelAccess`,
  `useUpdateCadence`, `useUpdateTemplate`) is wired in a follow-up
  feature, the new UI SHALL use the migrated dialog primitives by
  default; no special-casing needed.
- WHEN a Settings page has both a primary create and a secondary create
  (Channels has "Add account" + "Grant access"), the page header SHALL
  use a single primary button for the most-common action and a
  secondary button or per-row action for the other.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RDM-PRIM-01    | P1 Primitives | Design | Pending |
| RDM-PRIM-02    | P1 Primitives | Design | Pending |
| RDM-PRIM-03    | P1 Primitives | Design | Pending |
| RDM-PRIM-04    | P1 Primitives | Design | Pending |
| RDM-PRIM-05    | P1 Primitives | Design | Pending |
| RDM-PRIM-06    | P1 Primitives | Design | Pending |
| RDM-01         | P1 Settings | Design | Pending |
| RDM-02         | P1 Settings | Design | Pending |
| RDM-03         | P1 Settings | Design | Pending |
| RDM-04         | P1 Settings | Design | Pending |
| RDM-05         | P1 Settings | Design | Pending |
| RDM-06         | P1 Settings | Design | Pending |
| RDM-07         | P1 Settings | Design | Pending |
| RDM-08         | P1 Settings | Design | Pending |
| RDM-09         | P1 Settings | Design | Pending |
| RDM-10         | P1 Settings | Design | Pending |
| RDM-11         | P1 Workspace | Design | Pending |
| RDM-12         | P1 Workspace | Design | Pending |
| RDM-13         | P1 Workspace | Design | Pending |
| RDM-14         | P1 Workspace | Design | Pending |

**ID format:** `RDM-NN` for migrations; `RDM-PRIM-NN` for primitive
enhancements.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 20 total, 0 mapped to tasks yet, 20 unmapped — moves to Tasks phase.

---

## Success Criteria

- [ ] All P1 RDM-PRIM-NN and RDM-NN criteria verified in Chrome smoke.
- [ ] Zero inline "always-on" CRUD forms remain in
  `apps/web/src/routes/_app/settings/-components/` and
  `apps/web/src/routes/_app/workspace/-components/` (excluding the
  `CadenceBuilder` per the out-of-scope row).
- [ ] Every destructive mutation hook used in `apps/web` is invoked
  through a `DeleteResourceDialog` (typed-name) or a
  `ResourceDialog tone="destructive"` (bulk / reversible-with-impact).
  Audit: `grep -r "deleteCadence\|deleteTemplate\|deleteEntryTrigger\|revokeSession\|revokeOtherSessions\|updateMemberStatus\|pauseOwnerJourneys" apps/web/src/routes/_app/` shows every match originates from inside a dialog's `onAction`/`onDelete`, not a bare button `onClick`.
- [ ] `bun check` green; CI=1 `bunx vp lint` reports 0 warnings, 0
  errors; commitlint clean.
- [ ] `web-patterns.md` §6 examples align with what the code actually
  does (no doc-vs-code drift); ADR-007 needs no follow-up since this
  feature implements the doctrine it codified.
- [ ] `STATE.md` updated with the migration outcome; `ROADMAP.md` row
  flips from `IN PROGRESS` to `COMPLETE`.

---

## References

- ADR-007 — `docs/adr/007-web-frontend-layering.md`
- Web Patterns Rule — `.agents/rules/web-patterns.md` (especially §6 Dialog recipe and §7 Error handling table)
- Existing primitives:
  - `apps/web/src/components/composed/resource-dialog.tsx`
  - `apps/web/src/components/composed/delete-resource-dialog.tsx`
  - `apps/web/src/components/composed/form-error.tsx`
  - `apps/web/src/components/primitives/dialog.tsx`
  - `apps/web/src/components/primitives/button.tsx`
- Peer reference (hoxus): `/Users/nothing/Workspaces/hoxus/apps/web/src/components/dialogs/{resource-dialog.tsx,delete-resource-dialog.tsx}`
- Companion feature specs: `041-web-patterns-and-layering`, `042-web-feature-colocation-migration`, `043-api-client-hook-reshape`.
