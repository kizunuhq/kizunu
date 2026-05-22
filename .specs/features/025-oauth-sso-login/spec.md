# OAuth / SSO Login Specification

## Problem Statement

Self-host operators want their team to sign in with an existing identity provider
instead of managing another password. Kizunu only has email+password today. This
slice adds social OAuth login alongside it, with the provider integration behind a
port so a second provider is a plugin, not a rewrite — mirroring the channel/CRM
plugin pattern the codebase already uses.

## Goals

- [ ] Sign in / sign up with a social provider via the OAuth2 authorization-code flow.
- [ ] Account linking by **verified** email: a provider login attaches to the
      matching existing user instead of creating a duplicate.
- [ ] An `identities` table records `(provider, providerAccountId) → user`.
- [ ] Provider integration sits behind an `OAuthProvider` port + registry; GitHub is
      the first concrete provider, configured via env.
- [ ] The web login screen offers the enabled providers, driven by the public
      capability flag (no build switch).

## Settled Decisions (gray areas resolved in Specify)

| Decision                    | Choice                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| First provider              | **GitHub** (simple OAuth2, returns verified emails, no SDK). Google etc. are new providers behind the same port — structured follow-up. |
| Linking key                 | The provider's **verified primary email**. Unverified provider email never links or creates. |
| Email matches existing user | Link: create an `identity` row for that user and sign them in.                               |
| No matching user            | Create a new user (+ workspace + admin membership, like register), `emailVerifiedAt` set from the provider, `passwordHash` null. |
| Registration gate           | When `DISABLE_USER_REGISTRATION` is on, OAuth may **link/sign in existing** users but must **not create new** ones (consistent with slice 022). |
| CSRF on callback            | A random `state` stored in a short-lived httpOnly cookie, verified on the callback.          |
| Password column             | `users.passwordHash` becomes nullable; password login rejects null-hash (OAuth-only) accounts. |

## Out of Scope

| Feature                              | Reason                                              |
| ------------------------------------ | --------------------------------------------------- |
| Enterprise SAML / multi-tenant SSO   | Managed-cloud concern (Future Considerations)       |
| Unlinking a provider from the UI     | Add/login only this slice; unlink is a follow-up    |
| Provider profile-picture/name sync   | Store name on create only; no ongoing sync          |

---

## User Stories

### P1: Sign in with a provider ⭐ MVP

**User Story**: As a user, I want to sign in with GitHub so that I don't manage
another password.

**Acceptance Criteria**:

1. WHEN a user starts OAuth THEN the system SHALL redirect to the provider's
   authorization URL with a `state` it stored in a short-lived httpOnly cookie.
2. WHEN the provider redirects back with a valid code and matching `state` THEN the
   system SHALL exchange the code, read the verified profile, establish a session,
   and redirect into the app.
3. WHEN the `state` is missing or does not match THEN the system SHALL reject the
   callback (no session) — CSRF protection.
4. WHEN an `identity` already exists for `(provider, providerAccountId)` THEN the
   system SHALL sign in that user without creating anything.

**Independent Test**: with a fake provider, drive begin→callback; identity exists →
same user signed in; bad state → rejected.

---

### P1: Link by verified email ⭐ MVP

**User Story**: As an existing email+password user, I want my first GitHub login to
attach to my account so that I keep one identity.

**Acceptance Criteria**:

1. WHEN no identity exists but the provider's **verified** email matches an existing
   user THEN the system SHALL create an `identity` for that user and sign them in.
2. WHEN no identity and no user matches THEN the system SHALL create a new user
   (+ workspace + admin membership), mark the email verified, store no password,
   and create the identity.
3. WHEN the provider email is **not** verified THEN the system SHALL neither link nor
   create — it SHALL reject with a business-rule error.
4. WHEN registration is disabled and the flow would create a **new** user THEN the
   system SHALL reject with the registration-disabled error; linking/sign-in of an
   existing user SHALL still succeed.

**Independent Test**: fake provider returns a verified email of an existing user →
identity linked, same user; unknown verified email → new user+workspace; unverified
email → rejected; gate on + unknown email → rejected, gate on + existing → linked.

---

### P2: Provider buttons on login

**User Story**: As a user, I want a "Sign in with GitHub" button when the operator
enabled it.

**Acceptance Criteria**:

1. WHEN the capability flag lists enabled providers THEN the login screen SHALL show
   a button per provider linking to its begin route.
2. WHEN no providers are enabled THEN the login screen SHALL show only email+password.

**Independent Test**: toggle the GitHub env config, reload login, observe the button.

---

## Edge Cases

- WHEN the provider returns an error or no email THEN the callback SHALL reject
  cleanly (no session, redirect to login with an error indication).
- WHEN an unknown provider id is requested THEN the system SHALL 422 (unknown provider).
- WHEN a user already linked to the provider logs in again THEN no duplicate identity
  is created (idempotent on `(provider, providerAccountId)`).

---

## Requirement Traceability

| Requirement ID | Story                      | Phase | Status  |
| -------------- | -------------------------- | ----- | ------- |
| OAUTH-01       | P1: Sign in with provider  | -     | Pending |
| OAUTH-02       | P1: Sign in with provider  | -     | Pending |
| OAUTH-03       | P1: Sign in with provider  | -     | Pending |
| OAUTH-04       | P1: Sign in with provider  | -     | Pending |
| OAUTH-05       | P1: Link by verified email | -     | Pending |
| OAUTH-06       | P1: Link by verified email | -     | Pending |
| OAUTH-07       | P1: Link by verified email | -     | Pending |
| OAUTH-08       | P1: Link by verified email | -     | Pending |
| OAUTH-09       | P2: Provider buttons       | -     | Pending |

**Coverage:** 9 total. Design + Tasks follow (Complex: schema migration, port +
registry + GitHub provider, account-linking use-case, callback flow with state,
config, capability flag extension, web buttons).

---

## Success Criteria

- [ ] Begin→callback signs in/links/creates per the decision table; CSRF state enforced.
- [ ] Verified-email linking; unverified rejected; gate blocks new-user OAuth only.
- [ ] GitHub provider works against real GitHub; account-linking logic unit-tested via a fake provider.
- [ ] Login shows enabled providers; `bun check` green; CI-strict lint clean.
</content>
