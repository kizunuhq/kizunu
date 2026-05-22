# Web `/auth/*` Route Prefix Specification

## Problem Statement

The web auth pages live under a TanStack Router **pathless** group `(auth)`, so they
serve at top-level URLs (`/login`, `/signup`, `/verify-email`). The team wants them
under an explicit `/auth/*` prefix so auth URLs are namespaced and obvious, matching
the API's `/auth/*` surface.

## Goals

- [ ] Auth pages serve at `/auth/login`, `/auth/signup`, `/auth/verify-email`,
      `/auth/accept-invite/$token`.
- [ ] Every in-app redirect/navigation to an auth page targets the new path.
- [ ] Server-generated links into auth pages (OAuth login-error redirect, email
      verification link) target the new path.

## Out of Scope

| Feature                          | Reason                                              |
| -------------------------------- | --------------------------------------------------- |
| Password-reset web page          | Not built yet (deferred); no route to move          |
| `/workspace/*` app routes        | Unchanged — only the auth group moves               |

---

## User Stories

### P1: Namespaced auth URLs ⭐ MVP

**User Story**: As a user, I want auth pages under `/auth/*` so the URL scheme is
clear and consistent with the API.

**Acceptance Criteria**:

1. WHEN I visit `/auth/login` (or signup/verify-email/accept-invite) THEN the page
   SHALL render; the old top-level paths no longer resolve.
2. WHEN an unauthenticated user hits a protected route THEN they SHALL be redirected
   to `/auth/login`.
3. WHEN a user logs out THEN they SHALL land on `/auth/login`.
4. WHEN the OAuth callback fails THEN it SHALL redirect to `${webUrl}/auth/login?error=…`.
5. WHEN an email-verification link is mailed THEN it SHALL point to
   `${webUrl}/auth/verify-email?token=…` (web origin, prefixed path).

**Independent Test**: build the web app; visit `/auth/login`; log out → `/auth/login`;
inspect the mailed verify link in an e2e.

---

## Edge Cases

- WHEN the verification email is generated THEN the link SHALL use the **web** origin
  (`webUrl`), not the API origin, since the verify page is a web route.
- The password-reset link is aligned to the same scheme (`${webUrl}/auth/reset-password`)
  for forward-consistency, even though its web page is still deferred (no route yet).

---

## Requirement Traceability

| Requirement ID | Story                  | Phase | Status  |
| -------------- | ---------------------- | ----- | ------- |
| AUTHPREFIX-01  | P1: Namespaced URLs    | -     | Pending |
| AUTHPREFIX-02  | P1: Namespaced URLs    | -     | Pending |
| AUTHPREFIX-03  | P1: Namespaced URLs    | -     | Pending |
| AUTHPREFIX-04  | P1: Namespaced URLs    | -     | Pending |
| AUTHPREFIX-05  | P1: Namespaced URLs    | -     | Pending |

**Coverage:** 5 total. Design inline (mechanical rename + reference updates).

---

## Success Criteria

- [ ] Auth pages at `/auth/*`; redirects + server links updated.
- [ ] `bun check` green; CI-strict lint clean.
</content>
