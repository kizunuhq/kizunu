# 050 — /auth/me Connector Identities Specification

## Problem Statement

Feature 047 deferred the P2 from spec `OWNER-16`: surface a BDR's own
member-connector identities in `GET /auth/me` so the BDR can read their
own Pipedrive mapping from their profile screen, without needing
workspace-admin access to the admin endpoint.

## Goals

- [ ] `MeResponseSchema` gains `connectorIdentities: array of
      { connectorAccountId, connectorId, externalId }`.
- [ ] `GetMeUseCase` populates the field via
      `MemberConnectorIdentityRepository.listForUser(userId)`.
- [ ] Web profile screen shows a small read-only "Connector identities"
      card listing each mapping; empty state when none.

## Out of Scope

- Admin override of one's own mapping from the profile screen (admin
  endpoint already handles this).
- Source-email surfacing (audit metadata stays on the admin list).

---

## User Stories

### P1: `/auth/me` returns the BDR's connector identities ⭐ MVP

**User Story:** As a BDR, when I read my profile I want to see which
Pipedrive identities I'm linked to, so I can confirm the mapping is right
or flag it to my admin.

**Acceptance Criteria:**

1. WHEN a BDR with one mapping calls `GET /auth/me` THEN the response
   SHALL include `connectorIdentities: [{ connectorAccountId, connectorId,
   externalId }]`.
2. WHEN a BDR has no mappings THEN `connectorIdentities` SHALL be `[]`.

**Requirement IDs:** `ME-CID-01`, `ME-CID-02`.

---

### P1: Web profile shows the identities as a read-only card

**User Story:** Same; from the web.

**Acceptance Criteria:**

1. WHEN the profile screen renders THEN it SHALL include a "Connector
   identities" card listing rows of `{ connectorId, externalId }`.
2. WHEN the identities array is empty THEN the card SHALL show an empty
   state copy.

**Requirement IDs:** `ME-CID-03`, `ME-CID-04`.

---

## Success Criteria

- E2E test: a BDR with one Pipedrive mapping reads `/auth/me` and gets
  the identity in the response.
- `bun check` green.
