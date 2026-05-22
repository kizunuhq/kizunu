# Web Members Admin Specification

## Problem Statement

Admins need to manage who is in the workspace. The backend has list-members,
invite-member, and update-member-status; the `/workspace/members` route is a TODO. This
slice makes it a real screen: a members table with status, an invite form (showing the
invitation token to share, since v0.1 has no email sending), and active/inactive toggle.

## Goals

- [ ] Members table for the active workspace (name, email, role, status badge, joined).
- [ ] Invite form (email) that surfaces the returned invitation token/link.
- [ ] Toggle a member active/inactive.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Email delivery of invitations | No mail provider in v0.1; the token is shown to copy |
| Reassign-leads-on-deactivate | Engine `paused_owner_inactive` / reassign is a separate slice |
| FE unit tests | No web test harness; verified via `bun check` + build |

---

## User Stories

### P1: Manage members ⭐ MVP

**Acceptance Criteria**:

1. WHEN an admin opens `/workspace/members` THEN the active workspace's members SHALL be
   listed with name, email, role, and a status badge.
2. WHEN an admin invites an email THEN the invitation token SHALL be shown to copy and
   the list SHALL refresh.
3. WHEN an admin toggles a member's status THEN it SHALL update and reflect in the table.
4. WHEN there is no active workspace THEN the screen SHALL show a clear empty state.

**Independent Test (manual/typecheck)**: open the page as an admin; invite, toggle.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MEM-01 | P1: members table | Tasks | Verified |
| MEM-02 | P1: invite + token | Tasks | Verified |
| MEM-03 | P1: status toggle | Tasks | Verified |

**Coverage:** 3 total.

## Success Criteria

- [ ] `bun check` green + web build succeeds.
- [ ] Built from installed shadcn primitives (Table, Badge, Button, Input, Card).
</content>
