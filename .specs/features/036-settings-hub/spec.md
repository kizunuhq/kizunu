# Settings Hub Specification

## Problem Statement

Today the sidebar mixes operational pages (Journeys, Cadences) with workspace
admin pages (Members, Channels, Connectors, Security) at the same level. The
admin surfaces don't share a settings sub-nav or any cross-page structure,
the user has no profile page, and there's no workspace-info page to inspect
the workspace name/slug. Part 4 consolidates the admin pages under a single
`/settings/*` hub with a left sub-nav, adds the two missing pages
(Profile, Workspace), reserves a Billing placeholder for Phase 2, and
re-groups the sidebar accordingly.

## Goals

- [ ] Move every workspace-admin route under `/_app/settings/*`:
  - `/_app/workspace/members` → `/_app/settings/members`
  - `/_app/workspace/channels` → `/_app/settings/channels`
  - `/_app/workspace/connectors` → `/_app/settings/connectors`
  - `/_app/workspace/security` → `/_app/settings/security`
  - `/_app/workspace/my-channels` stays under `/_app/workspace/` (operational, per-user)
- [ ] Add new `/_app/settings/profile` (replaces the Part 1 placeholder), `/_app/settings/workspace`, `/_app/settings/billing`.
- [ ] Wrap every settings sub-route in a `SettingsLayout` that shows the
      sub-nav on the left and the active page on the right.
- [ ] Update `NAV_GROUPS` so the second sidebar group collapses to a single
      "Settings" entry pointing at `/settings/profile`.
- [ ] Replace the bespoke `<h1>` headings on each moved page with the
      composed `PageHeader` so titles are consistent.
- [ ] Profile page shows email + emailVerifiedAt status + a "Change password" link to `/auth/forgot-password` (since v0.1 has no in-app password-update endpoint).
- [ ] Workspace page shows workspace name + slug + the current user's role + a placeholder danger-zone row (read-only — no backend admin endpoint yet).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Password change endpoint | Backend has no in-app password update; use the existing forgot-password flow. |
| Workspace rename / delete | Backend has no admin endpoints for either. |
| Email change | Backend has no email-update endpoint. |
| Billing page content | Phase 2; placeholder only. |
| Redirects from old `/workspace/{members,...}` paths | v0.1 has no real users; deep links can break. |
| Move `/workspace/my-channels` | Per-user operational view, not admin. Stays under Operations. |

---

## User Stories

### P1: Admin pages live under /settings with a sub-nav ⭐ MVP

**Acceptance Criteria**:
1. WHEN the user clicks "Settings" in the sidebar THEN they SHALL navigate to `/settings/profile` (default landing).
2. WHEN the user lands on any `/settings/*` route THEN the page SHALL render inside `SettingsLayout`: left column = sub-nav (Profile, Workspace, Members, Channels, Connectors, Security, Billing), right column = active page content with a `PageHeader` at the top.
3. WHEN the user clicks a sub-nav item THEN the right column SHALL change to the target page; the left column persists.
4. WHEN the active route matches a sub-nav item THEN that item SHALL render with the `--background-300` active fill per the existing `SettingsLayout` primitive.
5. WHEN the existing route at `/_app/workspace/members` (etc.) is visited THEN it SHALL return 404 (no compatibility redirect for v0.1).

**Independent Test**: Click each sub-nav item, confirm right column updates and URL changes.

---

### P1: Profile page lights up ⭐ MVP

**Acceptance Criteria**:
1. WHEN `/settings/profile` renders THEN it SHALL show the current user's name, email, and email-verified status (with a CTA to verify if not verified).
2. WHEN the user clicks "Change password" THEN they SHALL navigate to `/auth/forgot-password`.
3. WHEN the profile page renders THEN the password-change row SHALL include a note that the change happens out-of-band via email (matching the existing reset-password flow).

---

### P1: Workspace page lights up ⭐ MVP

**Acceptance Criteria**:
1. WHEN `/settings/workspace` renders AND there is an active workspace THEN the page SHALL show workspace name, slug (mono), and the current user's role on that workspace.
2. WHEN there is no active workspace THEN the page SHALL render the same "no active workspace" placeholder used by the other admin pages.
3. WHEN the page renders THEN it SHALL include a placeholder danger-zone row noting "Workspace rename and delete arrive in Phase 2."

---

### P2: Billing placeholder

**Acceptance Criteria**:
1. WHEN `/settings/billing` renders THEN it SHALL show a placeholder card "Billing is part of the managed cloud — coming in Phase 2" and a link to the open-source GitHub repo.

---

## Edge Cases

- WHEN the user has no membership-derived role (cold start) THEN `/settings/workspace` SHALL render "—" for role.
- WHEN `useCurrentUser` is still pending THEN every settings page SHALL render its skeleton/empty state per the underlying manager's existing behavior; the `SettingsLayout` shell itself is not skeletonised.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SET-01 | P1: /settings/* lives in SettingsLayout | Design | Pending |
| SET-02 | P1: Sub-nav 7 items with active state | Design | Pending |
| SET-03 | P1: Old /workspace/{admin} paths 404 | Design | Pending |
| SET-04 | P1: Sidebar collapses Workspace group → Settings link | Design | Pending |
| SET-05 | P1: Each moved page uses PageHeader | Design | Pending |
| SET-06 | P1: Profile page shows user + verify status + change-password link | Design | Pending |
| SET-07 | P1: Workspace page shows name/slug/role + danger placeholder | Design | Pending |
| SET-08 | P2: Billing placeholder | Design | Pending |

---

## Success Criteria

- [ ] Every `/settings/*` sub-route lives inside `SettingsLayout`.
- [ ] No more bespoke `<h1>` headings; `PageHeader` everywhere.
- [ ] `NAV_GROUPS` has a single Settings link in the second group.
- [ ] `bun check` is green.
- [ ] Chrome validation across each sub-route.
