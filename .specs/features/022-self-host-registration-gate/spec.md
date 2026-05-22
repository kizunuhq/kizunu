# Self-host Registration Gate Specification

## Problem Statement

A self-hosted Kizunu instance currently exposes `POST /auth/register` publicly with no
way to lock it down. After the operator registers the first/master user, anyone who can
reach the instance can keep creating users and workspaces. Operators need a single global
toggle to close public signup, while keeping the invite/accept-invite path open.

## Goals

- [ ] An env-backed global toggle (`DISABLE_USER_REGISTRATION`) blocks public registration
      when on, returning a `422` business-rule error.
- [ ] The web `(auth)/signup` page reflects the gate via a public capability flag, not a
      build-time switch.
- [ ] No first-user bypass logic in code — the operator boots open, registers, then closes.
- [ ] The invite / `accept-invite` flow stays ungated.

## Out of Scope

| Feature                                  | Reason                                                        |
| ---------------------------------------- | ------------------------------------------------------------- |
| Instance-admin role / runtime UI toggle  | novu style: env-backed only; runtime admin auth is Phase 2+   |
| First-user bypass logic                  | Explicitly excluded — operator controls the gate via env      |
| Gating invite/accept-invite              | Members arrive through a separate, intentionally-open path    |
| Email verification on register           | Separate Phase 1.6 slice (feature 023)                        |

---

## User Stories

### P1: Operator closes public signup ⭐ MVP

**User Story**: As a self-host operator, I want to disable public registration with one env
var so that nobody can create accounts after I have registered the master user.

**Why P1**: The whole point of the slice — lock-down for real self-host operation.

**Acceptance Criteria**:

1. WHEN `DISABLE_USER_REGISTRATION` is unset or `false` THEN `POST /auth/register` SHALL
   behave exactly as today (create user + workspace + session).
2. WHEN `DISABLE_USER_REGISTRATION` is `true` THEN `POST /auth/register` SHALL throw a
   business-rule error rendered as HTTP `422` with code `identity.registration-disabled`,
   creating no user, workspace, or session.
3. WHEN registration is disabled THEN the invite and `accept-invite` flows SHALL continue
   to work unchanged.

**Independent Test**: Set the env var on, `POST /auth/register` → 422; the invite-accept
e2e still passes. Unset → register succeeds.

---

### P1: Web signup reflects the gate ⭐ MVP

**User Story**: As a visitor, I want the signup page to tell me when registration is
disabled so that I am not met with a confusing error after filling in a form.

**Why P1**: The vertical slice must include the user-facing reflection.

**Acceptance Criteria**:

1. WHEN the instance exposes registration capability `true` THEN the signup page SHALL
   render a working registration form that calls `POST /auth/register`.
2. WHEN capability is `false` THEN the signup page SHALL render a "registration disabled"
   state instead of the form.
3. WHEN the capability is read THEN it SHALL come from a public (unauthenticated) endpoint,
   not a hardcoded build switch.

**Independent Test**: Toggle the env var, reload `/signup`, observe form vs. disabled state.

---

## Edge Cases

- WHEN `DISABLE_USER_REGISTRATION` holds a non-boolean string THEN config loading SHALL
  coerce per existing boolean coercion (only `true`-ish enables the gate); invalid config
  fails fast at boot like other settings.
- WHEN the capability endpoint is called while unauthenticated THEN it SHALL still respond
  (it is `@Public()`), leaking only the boolean, never user data.

---

## Requirement Traceability

| Requirement ID | Story                          | Phase | Status  |
| -------------- | ------------------------------ | ----- | ------- |
| REGGATE-01     | P1: Operator closes signup     | -     | Pending |
| REGGATE-02     | P1: Operator closes signup     | -     | Pending |
| REGGATE-03     | P1: Operator closes signup     | -     | Pending |
| REGGATE-04     | P1: Web signup reflects gate   | -     | Pending |
| REGGATE-05     | P1: Web signup reflects gate   | -     | Pending |
| REGGATE-06     | P1: Web signup reflects gate   | -     | Pending |

**Coverage:** 6 total. Design skipped (no architectural decisions — env flag + use-case
guard + one public capability endpoint + web reflection, all on existing patterns).

---

## Success Criteria

- [ ] `DISABLE_USER_REGISTRATION=true` makes register return `422`; invite path unaffected.
- [ ] Signup page shows form when open, disabled state when closed, driven by the endpoint.
- [ ] Config documented in `docker/.env.example`, the config module, and env validation.
- [ ] `bun check` green; lint clean under CI strictness.
</content>
</invoke>
