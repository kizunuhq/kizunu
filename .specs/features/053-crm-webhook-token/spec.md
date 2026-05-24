# 053 — CRM Webhook Token Specification

## Problem Statement

`POST /webhooks/crm/:connectorAccountId` is `@Public` and trusts the
connector-account UUID in the path as the only secret. Documented as
CONCERNS Medium: pilot risk is low (the id is a random UUIDv7, not
exposed) but it is not defense-in-depth. Anyone who learns a connector
account id can post forged stage-entered events and start journeys.

Adding a per-account verify token closes the gap with the same pattern
feature 029 uses for Meta inbound (`verifyToken` on
`ChannelAccount.credentials`, surfaced as a `serverGenerated`
credential field).

## Goals

- [ ] Each new Pipedrive `ConnectorAccount` carries a server-generated
      `webhookToken` (32-byte hex) in its credentials, never accepted
      from request body.
- [ ] `POST /webhooks/crm/:connectorAccountId?token=<webhookToken>`
      verifies the query token against the stored value; 403 on
      mismatch, 200 on match.
- [ ] Connector accounts created **before** this feature (no
      `webhookToken` on their stored credentials) skip verification —
      backward-compatible so existing pilots don't break on deploy.
- [ ] No new schema column; the token lives inside the existing
      `connector_accounts.credentials` JSONB so the at-rest encryption
      from feature 030 wraps it for free.

## Out of Scope

- HMAC of the request body (Pipedrive doesn't sign payloads in v0.1's
  supported way). Token-in-URL is the realistic mechanism Pipedrive
  webhooks support natively.
- Rotating the token on existing rows. Admin can re-create the
  connector account for rotation (acceptable for v0.1).
- Surfacing the full webhook URL with the token in the admin UI. The
  URL is deterministic from `connectorAccountId + webhookToken`; admin
  can read both from the API. The polished URL display is a follow-up.

---

## User Stories

### P1: Inbound CRM webhook verifies the per-account token ⭐ MVP

**Acceptance Criteria:**

1. WHEN `POST /webhooks/crm/:id?token=<correct>` arrives AND the stored
   credentials carry `webhookToken = <correct>` THEN the controller
   SHALL proceed (200, current behavior).
2. WHEN the query `token` is missing AND credentials carry a
   `webhookToken` THEN the controller SHALL respond `403`.
3. WHEN the query `token` is wrong AND credentials carry a
   `webhookToken` THEN the controller SHALL respond `403`.
4. WHEN credentials carry **no** `webhookToken` (legacy account, pre-053)
   THEN the controller SHALL skip verification (200, current behavior).

**Requirement IDs:** `CRM-WT-01` through `CRM-WT-04`.

---

### P1: Connector-account create generates the token

**Acceptance Criteria:**

1. WHEN admin creates a Pipedrive connector account THEN the persisted
   credentials SHALL include a fresh `webhookToken` (32-byte hex,
   `crypto.randomBytes(32).toString('hex')`).
2. WHEN admin sends `webhookToken` in the request body THEN it SHALL be
   ignored — the server always generates its own. (Same boundary as
   Meta's `verifyToken` in feature 029.)

**Requirement IDs:** `CRM-WT-05`, `CRM-WT-06`.

---

## Success Criteria

- E2E: webhook with correct token → 200; webhook with wrong token →
  403; legacy account (no token in creds) → 200.
- `bun check` green.
