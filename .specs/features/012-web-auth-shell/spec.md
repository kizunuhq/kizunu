# Web Auth + App Shell Specification

## Problem Statement

The `apps/web` routes are TODO scaffolds. The backend + typed `@kizunu/api-client`
hooks for every domain exist, but there is no way to actually sign in or move around
the app. This slice — the first Minimum-UI increment — delivers a real login form and a
protected app shell (header with the current user + logout), the foundation every other
screen sits inside.

## Goals

- [ ] A working login form (email/password) wired to `useLogin`, with inline error and a
      pending state; on success it lands in the app.
- [ ] An app shell: a header showing the signed-in user and a working logout that returns
      to `/login`; primary nav links to the app sections.
- [ ] Already-authenticated users visiting `/login` are sent into the app.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Signup / accept-invite / password reset flows | Separate UI slices (backend invite exists; signup is admin-provisioned) |
| Admin/BDR feature screens (members, channels, cadences, journeys, …) | Subsequent Minimum-UI slices |
| FE unit tests | No web test harness yet (`TESTING.md`); verified via `bun check` typecheck/lint/build |

---

## User Stories

### P1: Sign in ⭐ MVP

**Acceptance Criteria**:

1. WHEN a user submits valid credentials THEN the app SHALL authenticate via `useLogin`,
   refresh the current user, and navigate into the app (`/workspace`).
2. WHEN credentials are invalid THEN the form SHALL show the API error message inline and
   stay on the login page.
3. WHILE the request is in flight THEN the submit control SHALL be disabled / show pending.
4. WHEN an already-authenticated user opens `/login` THEN they SHALL be redirected into
   the app.

**Independent Test (manual / typecheck)**: load `/login`, submit good/bad credentials,
observe navigation vs. inline error.

### P1: App shell + logout ⭐ MVP

**Acceptance Criteria**:

1. WHEN signed in THEN the protected layout SHALL render a header with the user's name/
   email and a logout control, plus nav to the app sections.
2. WHEN logout is clicked THEN the session SHALL end (`useLogout`) and the user SHALL be
   returned to `/login`.

**Independent Test**: sign in → see the shell → log out → back at `/login`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| WUI-01 | P1: login form | Tasks | Verified |
| WUI-02 | P1: redirect when authed | Tasks | Verified |
| WUI-03 | P1: shell + logout | Tasks | Verified |

**Coverage:** 3 total.

---

## Success Criteria

- [ ] `bun check` green (typecheck + lint + format).
- [ ] Login → app → logout works against the running API.
- [ ] Built only from installed shadcn primitives (no hand-rolled inputs/buttons).
</content>
