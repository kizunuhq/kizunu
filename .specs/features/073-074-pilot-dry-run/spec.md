# Pilot dry-run (073 + 074) — Specification

## Problem Statement

The operator needs a controlled way to validate that a specific Pipedrive
deal will dispatch cleanly before activating the trigger. The existing
health endpoints cover provider readiness; this slice validates the
end-to-end resolution chain for one specific deal — without sending an
actual touch.

## Goals

- [ ] **073** New endpoint
      `POST /workspaces/:id/connector-accounts/:accountId/dry-run`
      taking `{ externalDealId }` and returning a `ConnectorHealth`-shaped
      report covering:
  - `dealFetch` — `connector.fetchLead(externalId)` returns a lead.
  - `ownerExternal` — the lead has an `ownerExternalId`.
  - `ownerResolved` — the workspace has a `MemberConnectorIdentity` row
    mapping the owner to a member, OR `connector.fetchOwner` + the
    auto-match-by-email path resolves.
  - `phone` — the lead's `phone` is non-empty.
  - `primaryChannel` — the resolved member has a Meta-WhatsApp primary
    channel.
- [ ] **074** Wizard gains a "Dry run" row (status: never persisted; the
      operator clicks "Run dry-run" inline, picks a connector + types a
      deal ID, and sees the result). On success: green pill; on failure:
      list of failing checks.

## Out of Scope

- Pipedrive activity write-attempt (we don't want to log a stray
  activity).
- Template-variable resolution preview (covered by feature `048`).
- Multi-deal sweep.

## Acceptance Criteria

1. WHEN the operator POSTs the dry-run endpoint with a valid
   `externalDealId` THEN the response SHALL include each check from
   the list above with `status: ok | fail` and an optional `detail`.
2. WHEN any provider call throws THEN the corresponding check SHALL be
   `fail` with the error message; `overall` SHALL be `degraded`.
3. WHEN every check passes THEN `overall = 'ready'`.
4. The endpoint SHALL be guarded by `WorkspaceAdminGuard`.

## Notes

The dry-run reuses the existing `ResolveOwnerService` (feature `047`)
and `ChannelAccessRepository.findPrimaryAccount` (feature `062`) so
the resolution chain is identical to dispatch. Only `plugin.send` is
skipped.
