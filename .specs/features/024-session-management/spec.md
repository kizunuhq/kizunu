# Session Management UX Specification

## Problem Statement

A user has no visibility into where they are signed in and no way to revoke a
session short of a password reset (which nukes all sessions). The `sessions`
table already records each session's device, IP, and expiry, and the
`SessionRepository` already revokes by id and by user — but nothing exposes this
to the user. This slice gives users a security screen to see and revoke their
active sessions.

## Goals

- [ ] List a user's active sessions with device (user-agent), IP, signed-in time,
      last-seen, and expiry; the current session is flagged.
- [ ] Revoke an individual session by id (scoped to the requesting user).
- [ ] "Log out everywhere" — revoke all of the user's sessions except the current.
- [ ] A web security screen drives all three over the type-safe boundary.

## Out of Scope

| Feature                          | Reason                                                  |
| -------------------------------- | ------------------------------------------------------- |
| Admin revoking other users' sessions | Self-service only for this slice; admin tooling later |
| Geo-IP / device fingerprinting   | Show raw user-agent + IP; enrichment is Phase 2+        |
| Per-request precise last-seen    | Coalesced (~5 min granularity) to bound write load      |

---

## User Stories

### P1: See my active sessions ⭐ MVP

**User Story**: As a user, I want to see every place I'm signed in so that I can
spot a session I don't recognize.

**Acceptance Criteria**:

1. WHEN a signed-in user lists sessions THEN the system SHALL return only their
   own active (not revoked, not expired) sessions.
2. WHEN sessions are listed THEN each SHALL include device (user-agent), IP,
   signed-in time, last-seen, and expiry, and the current session SHALL be flagged.
3. WHEN an authenticated request is served THEN the current session's last-seen
   SHALL advance, coalesced to at most once per ~5 minutes (no write per request).

**Independent Test**: sign in from two agents, list → both appear, exactly one
flagged current; make a request, observe last-seen advance (coalesced).

---

### P1: Revoke a session ⭐ MVP

**User Story**: As a user, I want to revoke a specific session so that I can kick
out a device I no longer trust.

**Acceptance Criteria**:

1. WHEN a user revokes one of their own sessions THEN that session SHALL stop
   authenticating (its next request → 401).
2. WHEN a user tries to revoke a session that is not theirs (or does not exist)
   THEN the system SHALL respond with a not-found business-rule error and revoke
   nothing.
3. WHEN a user revokes the session they are currently using THEN it SHALL be
   revoked (the user is effectively logged out) — no special-casing.

**Independent Test**: revoke session B from session A → B's `me` returns 401, A
still works; revoke a random uuid → error, nothing changes.

---

### P1: Log out everywhere ⭐ MVP

**User Story**: As a user, I want to log out of all other sessions in one action
so that I can secure my account after losing a device.

**Acceptance Criteria**:

1. WHEN a user logs out everywhere THEN all their sessions EXCEPT the current one
   SHALL be revoked.
2. WHEN log-out-everywhere completes THEN the current session SHALL still
   authenticate.

**Independent Test**: three sessions, call from one → the other two return 401,
the caller still works.

---

### P2: Security screen

**User Story**: As a user, I want a screen listing my sessions with revoke and
"log out other sessions" actions.

**Acceptance Criteria**:

1. WHEN the security screen loads THEN it SHALL list sessions (current marked) with
   a revoke action per row and a "log out other sessions" action.
2. WHEN an action succeeds THEN the list SHALL refresh.

**Independent Test**: load the screen with multiple sessions, revoke one, observe
the row disappear.

---

## Edge Cases

- WHEN a session is already revoked or expired THEN it SHALL NOT appear in the list.
- WHEN "log out everywhere" runs with only the current session THEN it SHALL be a
  no-op success (nothing to revoke).
- WHEN revoking a well-formed but unknown/foreign session id THEN the system SHALL
  respond with the not-found business-rule error (422) and revoke nothing.

---

## Requirement Traceability

| Requirement ID | Story                       | Phase | Status  |
| -------------- | --------------------------- | ----- | ------- |
| SESSMGT-01     | P1: See my active sessions  | -     | Pending |
| SESSMGT-02     | P1: See my active sessions  | -     | Pending |
| SESSMGT-03     | P1: See my active sessions  | -     | Pending |
| SESSMGT-04     | P1: Revoke a session        | -     | Pending |
| SESSMGT-05     | P1: Revoke a session        | -     | Pending |
| SESSMGT-06     | P1: Revoke a session        | -     | Pending |
| SESSMGT-07     | P1: Log out everywhere      | -     | Pending |
| SESSMGT-08     | P1: Log out everywhere      | -     | Pending |
| SESSMGT-09     | P2: Security screen         | -     | Pending |

**Coverage:** 9 total. Design + Tasks follow (Large: schema migration, repo
methods, three use-cases, guard touch, controller, contracts/hooks, web screen).

---

## Success Criteria

- [ ] List returns only the caller's active sessions, current flagged.
- [ ] Revoke-one and log-out-everywhere behave per criteria; ownership enforced.
- [ ] Last-seen advances, coalesced.
- [ ] Security screen drives all three; `bun check` green; CI-strict lint clean.
</content>
