# Per-BDR WhatsApp number routing — Specification

## Problem Statement

The dispatcher already enforces "lead owner → primary channel of that
user" (feature 009 / `ChannelAccessRepository.findPrimaryAccount`). A
journey with `ownerUserId = null` or with an owner who has no primary
channel correctly fails to `error_state` — no fallback to another BDR's
number. What's missing is *visibility*: an operator cannot tell, before
the pilot launches, which active BDRs are correctly wired.

## Goals

- [ ] An operator can call
      `GET /workspaces/:id/routing-readiness` and see, per active
      member: whether they have access to at least one WhatsApp channel
      account, whether one of those is set as their primary, and an
      identity-mapping signal (existing `MemberConnectorIdentity` row
      for the workspace's active connector accounts).
- [ ] The web surface renders the report on `/settings/members`
      ("Routing readiness" panel) so the operator can audit BDR
      readiness at a glance.
- [ ] A dispatcher-side smoke test (focused unit) asserts the
      no-fallback property — added defensively so a future refactor
      cannot silently route through another BDR's channel.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Auto-assigning a primary channel | Operator decision; the UI surfaces the gap, recovery is manual. |
| Workspace-wide emergency stop | Feature 075. |
| BDR onboarding wizard | Feature 065. |
| Channel health rollup | Feature 061 covers per-channel-account health. |

---

## User Stories

### P1: Routing-readiness endpoint ⭐ MVP

**Acceptance Criteria**:

1. WHEN an admin calls `GET /workspaces/:id/routing-readiness` THEN system
   SHALL return `{ members: [{ membershipId, userId, name, email, status,
   hasWhatsappAccess, hasPrimaryWhatsappChannel, mappedConnectorAccountIds }] }`
   for every membership in the workspace (regardless of status; the UI
   filters).
2. WHEN a member has `status = 'inactive'` THEN their row SHALL still
   appear with the same shape; the UI can show them grayed out.
3. WHEN no Meta-WhatsApp channel plugin is registered (pre-Meta deploy)
   THEN every row SHALL have `hasWhatsappAccess = false` and the same
   for `hasPrimaryWhatsappChannel`.
4. WHEN the request comes from a non-admin THEN 403 (existing guard).

### P1: Dispatcher smoke test ⭐ MVP

**Acceptance Criteria**:

1. The existing `findPrimaryAccount(userId, pluginId)` SHALL be locked
   behind a focused unit test that asserts: querying user A returns A's
   primary even when user B has a primary in the same workspace; and
   when user A has none, returns `undefined` (no fallback). This test
   already implicitly exists via the dispatcher's
   `dispatchStep` no-channel → error_state path, but the explicit assertion
   makes the no-fallback invariant unkillable in a future refactor.

### P2: Web panel

**Acceptance Criteria**:

1. WHEN the operator visits `/settings/members` THEN the page SHALL show
   a "Routing readiness" panel listing each active member with one of:
   - **Ready** — has WhatsApp access + primary channel.
   - **Missing primary** — has access but no primary.
   - **No channel access** — no Meta-WhatsApp channel account assigned.
2. WHEN there are zero active members THEN the panel SHALL show an
   empty state with a "How to invite members" link.

---

## Edge Cases

- Member with multiple Meta channel accounts → flags `hasWhatsappAccess`
  true, `hasPrimaryWhatsappChannel` true if any is `isPrimary`.
- Multiple connector accounts → `mappedConnectorAccountIds` is a list.

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| BCR-01 | P1 endpoint | Pending |
| BCR-02 | P1 endpoint | Pending |
| BCR-03 | P1 dispatcher smoke | Pending |
| BCR-04 | P2 web panel | Pending |

## Success Criteria

- [ ] `bun check` green.
- [ ] No fallback regression possible (smoke test in place).
