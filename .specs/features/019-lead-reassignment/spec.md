# Lead Reassignment + Owner-Inactive Pause Specification

## Problem Statement

When a BDR leaves, the admin must (1) park that owner's running journeys so no touches
go out under an inactive owner, and (2) bulk-reassign their leads to another BDR, which
should resume the parked journeys under the new owner. The scope says this is a **manual
admin action — no automation in v0.1**. This closes the Workspace & Membership "reassign
leads" bullet and the Engine `paused_owner_inactive` bullet.

## Goals

- [ ] Pause an owner's running journeys → `paused_owner_inactive` (admin, manual).
- [ ] Reassign all of an owner's leads to another user and resume their parked journeys
      → `running` (next touch now).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Auto-pause on member deactivation | Scope: "No automation in v0.1"; avoids a workspace↔engine module cycle |
| Round-robin / load balancing | Phase 2 |

---

## User Stories

### P1: Pause an inactive owner's journeys ⭐ MVP

1. WHEN an admin pauses owner `U` THEN every `running` journey whose lead is owned by `U`
   in the workspace SHALL become `paused_owner_inactive` (no next touch).
2. WHEN a non-admin calls it THEN reject (403).

### P1: Reassign leads ⭐ MVP

1. WHEN an admin reassigns from `U1` to `U2` THEN every lead owned by `U1` in the
   workspace SHALL be re-owned by `U2`, and their `paused_owner_inactive` journeys SHALL
   resume `running` with `nextTouchAt = now`.
2. WHEN a non-admin calls it THEN reject (403).

**Independent Test**: integration — seed leads/journeys for an owner; pause → all
`paused_owner_inactive`; reassign → leads re-owned + journeys `running`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RSG-01 | P1: pause owner journeys | Tasks | Verified |
| RSG-02 | P1: reassign leads + resume | Tasks | Verified |

**Coverage:** 2 total.

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] Inactive owners stop sending; reassignment resumes journeys under the new owner.
</content>
