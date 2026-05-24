# Context — 047 CRM Owner Mapping

Gray-area decisions captured during the Specify phase. These shape `spec.md`
and pre-empt `design.md` debates.

## Decisions

### C-01 — Mapping is established by auto-match on verified email, with admin override

When the first ingest event arrives carrying an `ownerExternalId` that has no
existing mapping for `(connectorAccountId, externalId)`, the Pipedrive
connector calls `fetchOwner(externalId, credentials)` (a new method on the
`CRMConnector` contract) which returns `{ externalId, name, email } | null`.
If the returned email matches a workspace member whose
`users.emailVerifiedAt != null` and `memberships.status = 'active'`, the
system creates the mapping automatically and logs `createdBy = 'auto:email'`
on the row. Admins can list, edit, or delete mappings through a workspace API.

**Why over manual paste / BDR self-claim:**
- The pilot customer has 2 BDRs whose Pipedrive emails almost certainly equal
  their Kizunu login emails — auto-match wins on day one with zero clicks.
- Manual paste is slower and error-prone (Pipedrive user IDs are numeric, easy
  to mistype); it also blocks the first cadence run until admin is reachable.
- BDR self-claim requires every BDR to log into Kizunu before any of their
  deals can fire a cadence — surface friction the pilot can't absorb.
- The admin override path remains available for the cases where auto-match
  misses (email mismatch, multi-tenant Pipedrive instance, alias emails).

### C-02 — A journey whose owner can't be resolved enters `error_state` with reason `owner_not_mapped`; admin creating the matching mapping backfills + resumes

Ingestion always creates the lead and the journey. If `ownerUserId` cannot be
resolved (no mapping AND no email match), the journey enters
`error_state` (existing closed-vocabulary value) with a new reason string
`owner_not_mapped`. When the admin later creates a mapping for the same
`(connectorAccountId, externalId)`, the system backfills `leads.ownerUserId`
for matching leads and resumes any journeys parked in `error_state` with
reason `owner_not_mapped` for those leads (status → `running`,
`nextTouchAt = now`).

**Why over a new `pending_owner_mapping` status or 422-at-webhook:**
- A new `LeadJourneyStatus` value costs a `pgEnum` migration, an exhaustive
  transition-table update, and an `Assert<Equal<...>>` rewire (ADR-003). The
  semantic gain ("waiting on config" vs. "broken") doesn't earn that cost when
  the existing `error_state` + reason taxonomy already differentiates.
- Rejecting at the webhook (422) makes a deal that lingers in Pipedrive while
  admin sets up the mapping silently dropped — admin would need to manually
  re-trigger the stage transition. The "create + park + resume" path preserves
  the deal's history end-to-end.
- Auto-resume on mapping create means one admin action recovers all affected
  journeys for that external owner — no per-lead `reassign-leads` rerun.

### C-03 — Mapping shape is `(membershipId, connectorAccountId, externalId)` (per-account, not per-connector)

A workspace may host two Pipedrive connector accounts (e.g. one production +
one staging during migration); the same Kizunu user can appear under different
externalIds in each. The mapping key is therefore
`(connectorAccountId, externalId)` for uniqueness, with `membershipId` as the
target.

This is a Design-phase detail surfaced here so the spec can reference it
without further debate.

## Open for Design phase

- Where in the module tree the `MemberConnectorIdentity` aggregate lives
  (likely `apps/api/src/modules/crm/` as a workspace-owned entity, matching
  `ConnectorAccount`).
- The exact controller path (`/workspaces/:id/connector-accounts/:caId/identities`
  vs. flatter `/workspaces/:id/member-identities`).
- Whether `fetchOwner` is rate-limited inside the connector (Pipedrive caps at
  ~100 req / 10s — same constraint already documented for outbound actions).
- Schema for the `errorReason` field on `lead_journeys` (does it become a
  closed vocabulary, or stay a free string?). Today only the dispatcher sets
  it; with `owner_not_mapped` the surface grows enough to consider promoting.
