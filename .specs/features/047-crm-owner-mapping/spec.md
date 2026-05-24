# 047 — CRM Owner Mapping Specification

## Problem Statement

The dispatcher resolves the outbound channel by `lead.ownerUserId` via
`ChannelAccess.findPrimaryAccount(userId, pluginId)`. Today ingestion
(`StartJourneyUseCase.upsertLead`) never sets `ownerUserId` — the column
exists on `leads` but stays null — so every dispatched journey hits
`error_state` with reason `no_channel`. Documented as a HIGH item in
`.specs/codebase/CONCERNS.md` ("Dispatcher gaps: owner mapping, sendingWindow,
template variables"). This blocks every real pilot.

The pilot customer has 2 BDRs, each owning their own Pipedrive deals and each
with their own primary WhatsApp `ChannelAccount` via `ChannelAccess`. The
right BDR's number must send each cadence touch and receive the corresponding
"Lead respondeu" Pipedrive activity. Without owner mapping, neither resolves.

## Goals

- [ ] Ingestion sets `lead.ownerUserId` for every Pipedrive-sourced lead whose
      owner can be resolved to a workspace member; the dispatcher then resolves
      the correct primary channel and the cadence touches go out under the
      right BDR's WhatsApp number.
- [ ] Auto-match by verified email covers the common pilot case (BDR email in
      Pipedrive == BDR email in Kizunu) so a fresh 2-BDR setup needs zero
      manual mapping clicks.
- [ ] Admin can create, list, edit, and delete mappings to cover the cases
      auto-match misses, with sub-poller-tick recovery for parked journeys.
- [ ] No new `LeadJourneyStatus` value — the existing `error_state` + a new
      reason `owner_not_mapped` carries the semantics.

## Out of Scope

| Excluded | Reason |
| --- | --- |
| HubSpot / RD Station / other CRMs | Only Pipedrive ingests today (`feature 004`). The mapping table is per-`connectorAccountId` so it accommodates future connectors structurally, but `fetchOwner` is Pipedrive-only here. |
| BDR self-claim UI | Decided against in C-01 (context.md). Auto-match + admin override is the pilot path. |
| Bulk CSV import of mappings | Premature for 2 BDRs. Revisit if a customer ships with 10+ BDRs. |
| Audit log of mapping changes (who/when) | P3 nice-to-have; defer until a real audit need surfaces. |
| Round-robin / fallback owner when Pipedrive's `deal.user_id` is null | If `ownerExternalId` itself is null on the event, the deal has no Pipedrive owner — the journey lands in `error_state` with the existing `no_channel` (or new `owner_not_mapped` — chosen in Design). Not assigning a fallback BDR is deliberate; assignment is the customer's responsibility, not the engine's. |
| Email-based mapping for non-Pipedrive owner identities | The Pipedrive connector's `fetchOwner` is the only auto-match source. Other connectors will declare their own (or skip auto-match). |
| Reassignment cascades into the mapping table | `ReassignLeadsUseCase` (`feature 019`) updates `lead.ownerUserId` directly — the mapping table is for *new* leads. Reassigning an existing lead does not rewrite the mapping. Documented; revisit if it confuses operators. |

---

## User Stories

### P1: Ingest auto-resolves Pipedrive owner via email match ⭐ MVP

**User Story:** As an admin onboarding 2 BDRs onto a Pipedrive workspace, I
want each BDR's Pipedrive identity discovered automatically when the first
deal arrives, so I don't have to paste user IDs and the first cadence can
dispatch immediately.

**Why P1:** Without this, ingestion has no path to `ownerUserId`, so the
dispatcher can never resolve a channel. Auto-match is also the lowest-friction
admin experience and the most likely to succeed on day one (BDR Pipedrive
emails == BDR Kizunu emails in the pilot).

**Acceptance Criteria:**

1. WHEN a normalized `lead.stage_entered` event arrives with
   `ownerExternalId = "12345"` AND no mapping exists for
   `(connectorAccountId, externalId="12345")` THEN the system SHALL call
   `connector.fetchOwner("12345", credentials)`.
2. WHEN `fetchOwner` returns `{ email: "bdr@acme.com", name: "BDR Name" }`
   AND a `users` row exists with `email = "bdr@acme.com"`,
   `emailVerifiedAt != null`, an active membership in the event's workspace
   (`memberships.status = 'active'`) THEN the system SHALL create a
   `MemberConnectorIdentity` row with `(membershipId, connectorAccountId,
   externalId="12345", createdBy='auto:email', sourceEmail='bdr@acme.com')`
   AND set the upserted `lead.ownerUserId` to that membership's `userId`.
3. WHEN a mapping already exists for `(connectorAccountId, ownerExternalId)`
   THEN ingestion SHALL set `lead.ownerUserId` from the mapping AND SHALL NOT
   call `fetchOwner`.
4. WHEN `fetchOwner` returns an email matching a user whose `emailVerifiedAt
   IS NULL` OR whose membership is `inactive` OR who is not a member of the
   event's workspace THEN the system SHALL NOT create the mapping AND SHALL
   leave `lead.ownerUserId = null` (covered by P1 story 2).

**Independent Test:** Spin up a workspace with one active verified member
whose email matches a Pipedrive user (use a fake connector that resolves
`fetchOwner` to that email). Trigger ingestion; assert `member_connector_identities`
gains one row with `createdBy = 'auto:email'` and the new lead's `ownerUserId`
equals the member's `userId`.

**Requirement IDs:** `OWNER-01`, `OWNER-02`, `OWNER-03`, `OWNER-04`,
`OWNER-05`.

---

### P1: Unresolved owner parks the journey in error_state, not silently broken

**User Story:** As an admin, if the Pipedrive owner email doesn't match any
of my workspace's members, I want the journey to land in a clearly-named
error state so I can fix it — and once I do, I want everything to recover
without manually re-running anything per-lead.

**Why P1:** Without an explicit reason taxonomy, "no channel" today swallows
both "BDR forgot to set up their primary channel" and "Kizunu doesn't know
who the BDR is" — admins can't tell the two apart. And without auto-resume,
admin fixes mean rerunning `reassign-leads` for every affected lead, which
doesn't scale past the first surprise.

**Acceptance Criteria:**

1. WHEN ingestion completes with `lead.ownerUserId IS NULL` (no mapping AND
   no auto-match resolved) THEN the system SHALL create the journey in status
   `running` AND immediately transition it to `error_state` with reason
   `owner_not_mapped` (set on `lead_journeys.errorReason`).
2. WHEN `connector.fetchOwner` throws or times out THEN the system SHALL
   still create the lead and journey AND transition the journey to
   `error_state` with reason `owner_lookup_failed` AND log the underlying
   error.
3. WHEN admin creates a mapping `(membershipId, connectorAccountId,
   externalId)` THEN the system SHALL, in the same transaction:
   (a) update every `leads` row with `connectorAccountId, ownerExternalId =
   externalId, ownerUserId IS NULL` setting `ownerUserId =
   membership.userId`; (b) update every `lead_journeys` row in `error_state`
   with `errorReason = 'owner_not_mapped'` whose lead was updated in (a),
   setting `status = 'running'`, `errorReason = NULL`, `nextTouchAt = now()`.
4. WHEN admin creates a mapping that resolves zero leads (no historical
   deals from that Pipedrive user have arrived yet) THEN the system SHALL
   still persist the mapping (future deals will resolve through P1 story 1).

**Independent Test:** With no mapping, trigger ingestion for a Pipedrive
deal whose owner is unknown — assert the journey row exists with
`status = 'error_state'`, `errorReason = 'owner_not_mapped'`. Then create the
mapping for that `ownerExternalId`. Within one poller tick (or immediately
inside the transaction), assert the journey is back to `running` with a
fresh `nextTouchAt`.

**Requirement IDs:** `OWNER-06`, `OWNER-07`, `OWNER-08`, `OWNER-09`.

---

### P1: Admin manages mappings via the workspace API

**User Story:** As an admin, I want a single screen where I can see which of
my workspace members map to which Pipedrive users for each Pipedrive
connector account, override the auto-matched ones, and add the ones
auto-match missed.

**Why P1:** Even with auto-match doing the heavy lifting, the admin needs a
manual escape hatch for the long tail (alias emails, multi-tenant Pipedrive,
mismatched casing, etc.). The same path also satisfies the audit need —
"who's mapped to whom" is visible without grepping the DB.

**Acceptance Criteria:**

1. WHEN admin calls `GET /workspaces/:workspaceId/connector-accounts/:connectorAccountId/identities`
   THEN the system SHALL return all mappings for that account joined to the
   member (`{ id, membershipId, userId, userEmail, userName, externalId,
   createdBy, createdAt }`).
2. WHEN admin calls `POST /workspaces/:workspaceId/connector-accounts/:connectorAccountId/identities`
   with `{ membershipId, externalId }` AND no row already exists with that
   `externalId` for the account AND that `membershipId` has no other
   `externalId` for the account THEN the system SHALL persist the mapping
   with `createdBy = 'admin:<userId>'` AND trigger the backfill + journey
   resume specified in the previous story.
3. WHEN admin attempts to create a mapping where the `externalId` is already
   taken by another member on the same account OR the `membershipId` already
   has a different `externalId` on the same account THEN the system SHALL
   respond `422` with code `owner.mapping-conflict` AND the conflicting row
   id in the error context.
4. WHEN admin calls `PATCH /workspaces/:workspaceId/connector-accounts/:connectorAccountId/identities/:id`
   with `{ membershipId }` THEN the system SHALL update the mapping
   (changing who owns this Pipedrive externalId) AND backfill the affected
   leads AND resume the journeys, same as create.
5. WHEN admin calls `DELETE /workspaces/:workspaceId/connector-accounts/:connectorAccountId/identities/:id`
   THEN the system SHALL remove the mapping. Affected leads SHALL retain
   their existing `ownerUserId` (deleting the mapping only removes the
   auto-fill rule for *new* deals; reassigning historical leads is a
   separate admin action).
6. WHEN a `memberships` row is deleted THEN every mapping referencing that
   `membershipId` SHALL be deleted by FK cascade.

**Independent Test:** Hit each endpoint via supertest against the running
NestJS app; assert the conflict cases return `422 owner.mapping-conflict`
and the create/update flows trigger the documented side-effects on
historical leads and journeys.

**Requirement IDs:** `OWNER-10`, `OWNER-11`, `OWNER-12`, `OWNER-13`,
`OWNER-14`, `OWNER-15`.

---

### P2: BDR sees their own mapping in their profile

**User Story:** As a BDR, I want to see in my profile which Pipedrive
identities I'm currently linked to, so when a journey of mine errors out I
can tell whether to ask admin to fix the mapping or whether the problem is
elsewhere.

**Why P2:** Useful for self-service triage; not required for the pilot to
deliver, because admin can read the same data from the admin endpoint.

**Acceptance Criteria:**

1. WHEN a BDR fetches `GET /auth/me` THEN the response SHALL include
   `connectorIdentities: [{ connectorAccountId, connectorId, externalId }]`
   for their active memberships' workspaces.
2. WHEN the BDR has no mappings THEN `connectorIdentities` SHALL be `[]`
   (empty, not absent).

**Independent Test:** Authenticate as a BDR with one mapping; assert
`GET /auth/me` returns the identity. Then delete the mapping and assert the
array becomes empty.

**Requirement IDs:** `OWNER-16`.

---

### P3: Audit metadata on every mapping

**User Story:** As an operator, I want to be able to tell from a mapping
row whether it was auto-matched or admin-created, and which email was
matched if it was auto.

**Why P3:** Forensic value; not required for the pilot to run.

**Acceptance Criteria:**

1. WHEN a mapping is created via auto-match THEN
   `createdBy = 'auto:email'` AND `sourceEmail = <matched email>` are
   persisted alongside the row.
2. WHEN a mapping is created or updated by an admin THEN
   `createdBy = 'admin:<userId>'` AND `sourceEmail = NULL` are persisted.

**Requirement IDs:** `OWNER-17`.

---

## Edge Cases

- WHEN two members of the same workspace share an email (impossible by
  the `users.email` unique constraint, but possible across deactivated +
  reactivated cycles) THEN auto-match SHALL link to whichever user the
  `users.email` index returns AND audit logs the chosen `userId`.
- WHEN Pipedrive returns the owner with a *different-cased* email
  (`BDR@Acme.com` vs. `bdr@acme.com`) THEN the lookup SHALL compare
  case-insensitively (the Postgres `users.email` column doesn't enforce
  case-folding, but Kizunu's `IdentityService` normalizes to lowercase on
  register — verify and lowercase the Pipedrive email before lookup).
- WHEN `connector.fetchOwner` returns `null` (Pipedrive user not found —
  e.g. the BDR was deleted in Pipedrive) THEN the system SHALL leave the
  mapping absent AND park the journey in `error_state` reason
  `owner_not_mapped` (same as no match).
- WHEN the Pipedrive owner email matches multiple verified-active members
  in the workspace (shouldn't be possible with the `users.email` unique
  index, defensive only) THEN auto-match SHALL link to the member with the
  earliest `memberships.createdAt`.
- WHEN ingestion observes the same `(connectorAccountId, ownerExternalId)`
  concurrently for two leads AND no mapping exists yet THEN the
  `fetchOwner`+create-mapping path SHALL be idempotent — a uniqueness
  constraint on `(connectorAccountId, externalId)` plus an INSERT ... ON
  CONFLICT DO NOTHING resolves the race; the loser falls through and reads
  the winner's mapping.
- WHEN a Pipedrive deal arrives with `ownerExternalId IS NULL` (deal with
  no owner) THEN ingestion SHALL leave `lead.ownerUserId` null AND
  transition the journey to `error_state` with reason `owner_not_mapped`
  (same outcome as unknown owner; admin must reassign in Pipedrive then
  re-trigger).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OWNER-01 | P1: Ingest auto-resolves | Design | Pending |
| OWNER-02 | P1: Ingest auto-resolves | Design | Pending |
| OWNER-03 | P1: Ingest auto-resolves | Design | Pending |
| OWNER-04 | P1: Ingest auto-resolves | Design | Pending |
| OWNER-05 | P1: Ingest auto-resolves | Design | Pending |
| OWNER-06 | P1: Unresolved owner parks | Design | Pending |
| OWNER-07 | P1: Unresolved owner parks | Design | Pending |
| OWNER-08 | P1: Unresolved owner parks | Design | Pending |
| OWNER-09 | P1: Unresolved owner parks | Design | Pending |
| OWNER-10 | P1: Admin manages mappings | Design | Pending |
| OWNER-11 | P1: Admin manages mappings | Design | Pending |
| OWNER-12 | P1: Admin manages mappings | Design | Pending |
| OWNER-13 | P1: Admin manages mappings | Design | Pending |
| OWNER-14 | P1: Admin manages mappings | Design | Pending |
| OWNER-15 | P1: Admin manages mappings | Design | Pending |
| OWNER-16 | P2: BDR sees own mapping | - | Pending |
| OWNER-17 | P3: Audit metadata | - | Pending |

**Coverage:** 17 total, 0 mapped to tasks, 17 unmapped (Design phase pending).

---

## Success Criteria

How we know the feature is successful:

- [ ] In an integration test that spins up a fake Pipedrive connector with
      `fetchOwner` returning a verified-active-member email, ingestion of a
      `lead.stage_entered` event produces a lead with non-null `ownerUserId`
      and a `running` journey without any admin action.
- [ ] In the same integration test with the email **not** matching, the
      journey lands in `error_state` with reason `owner_not_mapped` and the
      lead has `ownerUserId IS NULL`. Creating the mapping via admin API
      transitions the same journey back to `running` and sets the lead's
      `ownerUserId`, all in one HTTP call.
- [ ] Pilot dry-run: a fresh 2-BDR workspace with two Pipedrive users whose
      emails match Kizunu logins requires **zero** admin clicks for the
      first deal of each BDR to start dispatching under the right WhatsApp
      number.
- [ ] No new `LeadJourneyStatus` enum value (the closed vocabulary is
      unchanged); only `lead_journeys.errorReason` gains the
      `owner_not_mapped` + `owner_lookup_failed` strings.
- [ ] Conflicting mapping attempts return `422 owner.mapping-conflict`; no
      `5xx` reaches the admin UI under any documented edge case.
