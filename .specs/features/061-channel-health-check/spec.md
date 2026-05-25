# WhatsApp CoEx setup readiness (channel health) — Specification

## Problem Statement

The CRM side of the pilot now has a structured health check (feature 060).
The WhatsApp Coexistence side does not. A Meta OAuth token can expire,
the WABA `phone_number_id` can stop resolving, the server-generated
`verifyToken` can get truncated by an operator copying credentials by
hand. None of those failures surface until the dispatcher tries to send
a touch, by which point the journey is already in `error_state`.

## Goals

- [ ] An operator can call `GET /workspaces/:id/channel-accounts/:accountId/health`
      and receive a structured report covering the v1.0 send + reply-stop
      surfaces of the Meta WhatsApp plugin (both Cloud API and Coex).
- [ ] The mechanism lives behind a generic `ChannelPlugin.checkHealth?`
      hook so a second channel (Telegram, email) ships health the same way.
- [ ] The web settings/channels row surfaces the same Ready/Degraded/
      Unreachable pill the connectors page introduced in 060, **reusing
      the existing `ConnectorHealthPill` primitive** rather than forking
      it — the wire shape is identical.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Per-BDR primary-channel-access check | Feature 062 — Per-BDR WhatsApp number routing. The per-channel health pill stays per-account; the BDR-routing check is per-workspace + per-member. |
| App-wide Meta config presence (appId / appSecret / coexConfigId) | These live in env, not on the channel row. They will be exposed via a separate `GET /workspaces/:id/setup-readiness` aggregator in feature 067. |
| Periodic background polling | On-demand only. |
| Auto-refresh of access tokens | The existing `OAuthRefreshService` (feature 030) already runs every tick. Health just *reports* expiry; recovery is the refresh service's job. |

---

## User Stories

### P1: Channel health endpoint ⭐ MVP

**User Story**: As a pilot operator, I want a structured health report on
each channel account so that I know it can send and route inbound replies.

**Acceptance Criteria**:

1. WHEN `GET /workspaces/:id/channel-accounts/:accountId/health` is called
   THEN system SHALL return `{overall, checks}` with the same vocabulary
   as the CRM health endpoint (`ready` | `degraded` | `unreachable`
   for overall, `ok` | `fail` for per-check).
2. WHEN the requested account is not in the workspace THEN system SHALL
   return HTTP 404 with `channel.account-not-found`.
3. WHEN the registered plugin omits `checkHealth?` THEN system SHALL
   return HTTP 422 with `channel.health-unsupported`.
4. WHEN the request is not from a workspace admin THEN system SHALL
   return HTTP 403 (`WorkspaceAdminGuard`).
5. The shared `ConnectorHealth` types are reused. The shape is
   "connector" by name, but it is intentionally a generic health
   envelope — both CRM and channel surfaces consume it.

### P1: Meta (Cloud API + Coex) checks ⭐ MVP

**User Story**: As an operator running the Meta-WhatsApp pilot, I want
the report to actually exercise Meta's surfaces so that "ready" means
the next dispatch will succeed.

**Acceptance Criteria**:

1. The Meta plugin's `checkHealth` SHALL emit at minimum these checks:
   - `token` ↔ "Access token" — `GET /me?access_token=…` against Meta
     Graph returns 200.
   - `phoneNumber` ↔ "Phone number" — `GET /{phoneNumberId}?access_token=…`
     returns 200 (the existing Coex routing depends on it).
   - `verifyToken` ↔ "Verify token" — `credentials.verifyToken` is a
     non-empty string. No network call.
2. WHEN the credential is `channelMode = 'coexistence'` AND
   `credentials.accessTokenExpiresAt` is within 5 minutes of `now` THEN
   the report SHALL include an additional check `expiry` ↔ "Token expiry"
   with status `fail` and detail naming the time-to-expiry.
3. WHEN the credential is `channelMode = 'cloud_api'` THEN the `expiry`
   check SHALL be skipped — the system token is long-lived.
4. WHEN `/me` returns 401 OR 403 THEN `token` SHALL be `fail` and overall
   SHALL be `unreachable`.
5. WHEN any non-token Meta call fails for other reasons THEN the
   corresponding check SHALL be `fail` with a `'GET <path> -> <status>'`
   detail, AND overall SHALL be `degraded` (token-unreachable wins).
6. The Meta calls SHALL be issued in parallel.

### P2: Web pill on channels list

**User Story**: As an operator reviewing settings/channels, I want a
colored health pill on each channel-account row, identical in style to
the connector pill so the operational language stays consistent.

**Acceptance Criteria**:

1. WHEN the channels list renders THEN each row SHALL fetch its health
   via `useChannelHealth(workspaceId, accountId)` (TanStack Query;
   30s staleTime; manual refresh).
2. The existing `ConnectorHealthPill` SHALL be reused (rename
   acceptable; do **not** fork the primitive). The pill's contract is
   `{ health, isPending, onRefresh }` and the data shape is identical.

---

## Edge Cases

- WHEN `credentials.accessTokenExpiresAt` is `null` (no expiry set —
  long-lived token) THEN the `expiry` check SHALL be skipped, not
  reported as `fail`.
- WHEN `credentials.verifyToken` is empty/missing on a pre-029 row THEN
  the `verifyToken` check SHALL `fail` with a one-line explanation
  pointing at re-create.
- WHEN the Meta `phoneNumberId` is missing from credentials (illegal
  state per the schema) THEN system SHALL surface `phoneNumber` =
  `fail` with detail `'No phoneNumberId on this channel account.'`
  rather than throwing.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CHH-01 | P1 endpoint | Design | Pending |
| CHH-02 | P1 endpoint | Design | Pending |
| CHH-03 | P1 endpoint | Design | Pending |
| CHH-04 | P1 endpoint | Design | Pending |
| CHH-05 | P1 endpoint | Design | Pending |
| CHH-06 | P1 Meta | Design | Pending |
| CHH-07 | P1 Meta | Design | Pending |
| CHH-08 | P1 Meta | Design | Pending |
| CHH-09 | P1 Meta | Design | Pending |
| CHH-10 | P1 Meta | Design | Pending |
| CHH-11 | P1 Meta parallel | Design | Pending |
| CHH-12 | P2 web pill | Design | Pending |
| CHH-13 | P2 reuse primitive | Design | Pending |

## Success Criteria

- [ ] One round-trip per channel row; cached 30s.
- [ ] `bun check` green.
- [ ] No duplication of the pill primitive — the connector pill is
      promoted to a generic name and reused.
