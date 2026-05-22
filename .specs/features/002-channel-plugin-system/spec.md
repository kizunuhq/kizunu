# Channel Plugin System Specification

## Problem Statement

Kizunu must send outbound touches over pluggable channels without the engine
knowing channel specifics. v0.1 needs the frozen `ChannelPlugin` contract (D2),
a registry to resolve plugins by id, and the workspace-owned `ChannelAccount`
(plugin instance + credentials) and `ChannelAccess` (`isPrimary` per user/plugin)
domain entities so a BDR's lead can later be routed to their primary channel.

This feature delivers that foundation, proven end-to-end with a test/fake plugin.
The real Meta/WhatsApp plugin and the app-level inbound webhook are the next slice
(feature `003`); both roadmap slices share the "Channel plugin system + Meta/WhatsApp"
roadmap line.

## Goals

- [ ] Freeze the `ChannelPlugin` port (`manifest`, `send`, `parseInbound`,
      `validate -> Decision`) as an in-monorepo module (D2), with one type per file.
- [ ] Provide a `ChannelPluginRegistry` that registers plugins and resolves them by id.
- [ ] Model `ChannelAccount` (workspace-owned, no `ownerId`, credentials validated
      against the plugin's `configSchema`) and `ChannelAccess` (`isPrimary` per
      user/plugin) as domain tables + repositories.
- [ ] Admin can create channel accounts and grant/revoke user access; a member can
      list their channels and set one primary per plugin.
- [ ] Credentials are never returned by any read endpoint.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Meta/WhatsApp plugin implementation | Feature `003` (this slice ships the port + a fake plugin) |
| App-level inbound webhook + `hub.verify_token` routing | Feature `003` |
| Credential encryption at rest | Flagged concern; v0.1 stores credentials in jsonb. Tracked in CONCERNS |
| Engine channel resolution / dispatch | Engine feature; this slice exposes the `findPrimaryAccess` query seam only |
| Channel account update/rename UI flow | Set-primary + grant/revoke cover v0.1; rename deferred |
| Web UI screens | Minimum UI feature; this slice ships contracts + api-client hooks |

---

## User Stories

### P1: Frozen channel plugin contract + registry ⭐ MVP

**User Story**: As an engine author, I want a stable `ChannelPlugin` port and a
registry, so outbound/inbound code depends only on the contract, never on Meta.

**Why P1**: Every later slice (accounts, Meta plugin, engine) binds to this port.

**Acceptance Criteria**:

1. WHEN a plugin is registered THEN the registry SHALL resolve it by `manifest.id`.
2. WHEN an unknown plugin id is requested THEN the registry SHALL raise
   `UnknownChannelPluginException` (not return undefined).
3. WHEN two plugins register the same `manifest.id` THEN the registry SHALL raise a
   duplicate-registration error.
4. WHEN the registry lists plugins THEN it SHALL return manifests only (no secrets,
   no functions exposed beyond the manifest shape).

**Independent Test**: Register a fake plugin, resolve it by id, assert unknown id
throws and duplicate id throws.

---

### P1: Channel accounts owned by the workspace ⭐ MVP

**User Story**: As an admin, I want to create a channel account (a plugin instance
with credentials) owned by the workspace, so BDRs can later be granted access.

**Why P1**: A `ChannelAccount` is the unit access and sends attach to.

**Acceptance Criteria**:

1. WHEN an admin creates an account with a registered `pluginId` and credentials
   that satisfy the plugin's `configSchema` THEN the system SHALL persist it scoped
   to the workspace and return its id.
2. WHEN the `pluginId` is not registered THEN the system SHALL reject with
   `UnknownChannelPluginException`.
3. WHEN the credentials fail the plugin's `configSchema` THEN the system SHALL reject
   with `InvalidChannelCredentialsException` (422) and SHALL NOT persist.
4. WHEN a non-admin calls create THEN the system SHALL reject (403, via admin guard).
5. WHEN accounts are listed for a workspace THEN the system SHALL return id, pluginId,
   name, and timestamps, and SHALL NOT return credentials.

**Independent Test**: Create an account via the fake plugin's schema, list it, assert
credentials absent; assert unknown plugin and bad credentials are rejected.

---

### P1: Channel access and primary selection ⭐ MVP

**User Story**: As an admin, I grant a BDR access to a channel account; as a BDR, I
mark one account primary per plugin, so the engine can resolve my outbound channel.

**Why P1**: `ChannelAccess` + `isPrimary` is the routing seam the engine consumes.

**Acceptance Criteria**:

1. WHEN an admin grants a workspace member access to a workspace account THEN the
   system SHALL persist a `ChannelAccess` row.
2. WHEN access is granted to a user who is not a member of the account's workspace
   THEN the system SHALL reject (`UserNotInWorkspaceException`).
3. WHEN access is granted to an account outside the admin's workspace THEN the system
   SHALL reject (`ChannelAccountNotFoundException`).
4. WHEN access already exists for `(channelAccountId, userId)` THEN the grant SHALL be
   idempotent (no duplicate row, no error).
5. WHEN a member sets an account primary THEN the system SHALL clear `isPrimary` on
   that member's other accounts **of the same plugin** and set it on the chosen one.
6. WHEN a member sets primary on an account they do not have access to THEN the system
   SHALL reject (`ChannelAccessNotFoundException`).
7. WHEN a member lists their channels THEN the system SHALL return only accounts they
   can access, each with its `pluginId`, `name`, and `isPrimary` flag.
8. WHEN the engine queries the primary access for `(userId, pluginId)` THEN the repo
   SHALL return at most one access (the primary), or none.

**Independent Test**: Grant access, set primary across two accounts of one plugin,
assert exactly one primary remains; assert list-mine reflects access + primary.

---

### P2: Revoke access and list available plugins

**User Story**: As an admin, I revoke a BDR's access and see which plugins exist.

**Why P2**: Needed for the admin UI, not for the first vertical proof.

**Acceptance Criteria**:

1. WHEN an admin revokes access THEN the system SHALL delete the `ChannelAccess` row;
   revoking a non-existent access SHALL be a no-op (idempotent).
2. WHEN available plugins are listed THEN the system SHALL return each registered
   plugin's manifest (id, name, capabilities) for selection.

**Independent Test**: Grant then revoke, assert list-mine no longer includes it;
list plugins returns the fake plugin manifest.

---

## Edge Cases

- WHEN credentials contain extra unknown keys THEN `configSchema` validation SHALL
  strip or reject per the plugin schema (plugin-defined; default: reject).
- WHEN a member sets primary on an account, then sets a different account of a
  **different** plugin primary THEN both SHALL remain primary (primary is per-plugin).
- WHEN listing my channels and I have access to none THEN the system SHALL return `[]`.
- WHEN revoking access removes the primary account THEN the user simply has no primary
  for that plugin (engine query returns none) — no auto-reassignment.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CHAN-01 | P1: Contract + registry | Tasks | Verified |
| CHAN-02 | P1: Contract + registry (unknown/duplicate id) | Tasks | Verified |
| CHAN-03 | P1: Accounts (create + schema validation) | Tasks | Verified |
| CHAN-04 | P1: Accounts (admin-only, no credentials leak) | Tasks | Verified |
| CHAN-05 | P1: Access (grant + membership/workspace checks + idempotent) | Tasks | Verified |
| CHAN-06 | P1: Access (set primary per plugin) | Tasks | Verified |
| CHAN-07 | P1: Access (list mine + primary query seam) | Tasks | Verified |
| CHAN-08 | P2: Revoke access | Tasks | Verified |
| CHAN-09 | P2: List available plugins | Tasks | Verified |

**Coverage:** 9 total, all implemented and covered by unit/integration tests (registry,
grant/set-primary/revoke use-cases, and the access-repository invariant). Thin
create/list controllers and use-cases are passthrough — covered conceptually by the
typed HTTP boundary; CHAN-04's no-credentials-leak is enforced at the query projection.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] Fake plugin registers and drives create/access/primary flows in tests.
- [ ] No endpoint returns channel credentials.
- [ ] `ChannelAccess` primary is provably one-per-user-per-plugin.
- [ ] Contract types are import-stable for feature `003` (Meta) and the engine.
</content>
</invoke>
