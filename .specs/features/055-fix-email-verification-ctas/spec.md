# Fix Email-Verification CTAs Specification

## Problem Statement

The unverified-email state surfaces in-app CTAs that lead users into dead-end
error pages instead of toward a working remediation. The verification flow only
works when the user clicks the token-bearing link in their email, but the app
exposes "Open verify page" and "Verify" buttons that navigate to
`/auth/verify-email?token=` (empty), which the verify panel short-circuits to
its "This verification link is missing its token" error. The error state then
offers a "Request a new link" CTA that goes to the password-reset flow, not
the email-verification resend.

## Goals

- [ ] Remove every in-app navigation that lands a user on the verify panel
      without a real token.
- [ ] Replace those CTAs with a working in-context resend, using the existing
      `useResendEmailVerification` hook.
- [ ] Make the verify panel's error state recover to a working action, gated by
      auth state (resend if signed in, sign-in link if not).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| API/contract/use-case changes | The backend resend + confirm flow already works; only the web CTAs are wrong. |
| Inbox simulation or "open last sent link" dev affordance | Pilot-time noise; the email is the source of truth. |
| Copy revision beyond the CTAs being replaced | Out-of-scope rewriting of banner/panel headlines. |
| Email-change flow | `Change email` already deep-links into settings/profile; not part of this bug. |
| New design-system components | Compose existing primitives. |

---

## User Stories

### P1: Banner stops sending users to a dead-end ⭐ MVP

**User Story**: As an unverified user looking at the app shell, I want the
verify banner to only show actions that actually help me, so that I don't end
up on a "missing token" error page.

**Why P1**: This is the headline bug — every page in `_app/` shows this banner
to unverified users, so the broken CTA is reproducible on first login.

**Acceptance Criteria**:

1. WHEN an unverified user views the app shell THEN the banner SHALL NOT render
   an "Open verify page" link.
2. WHEN an unverified user views the app shell THEN the banner SHALL retain
   the "Verify your email" headline, the description, the "Change email" link,
   and the "Resend email" button (the headline and description are static; the
   resend success signal lives on the button itself — see EVCTAS-03).
3. WHEN the user clicks "Resend email" THEN the button SHALL disable, switch
   to "Sending…" while pending, then to "Sent" on success (single shared
   `<ResendEmailButton>` composed component used here, on settings/profile, and
   on the verify panel — the per-surface previous-banner-only "Verification
   email sent" headline-swap is removed in favor of consistent, in-button
   feedback across all three surfaces).
4. WHEN the resend mutation fails on the banner THEN the failure SHALL surface
   via `toast.error(getApiErrorMessage(err))` (previously silent on the
   banner; fixed alongside the consolidation).

**Independent Test**: Register a new account, land on `/workspace`, confirm the
banner has no "Open verify page" link and "Resend email" cycles through
Resend → Sending… → Sent.

---

### P1: Settings/profile resend replaces broken Verify CTA ⭐ MVP

**User Story**: As an unverified user on settings/profile, I want a Resend
email button next to my email, so that I can request a new verification link
without leaving the page.

**Why P1**: The current "Verify" button leads to the same dead-end error;
removing it without an in-context replacement would leave settings/profile with
no remediation at all.

**Acceptance Criteria**:

1. WHEN an unverified user opens `/settings/profile` THEN the email row SHALL
   show a "Resend email" action button instead of "Verify".
2. WHEN the user clicks "Resend email" on the row THEN the button SHALL disable
   and switch to "Sending…" while the mutation is pending, and to "Sent" on
   success (matching the banner's pattern).
3. WHEN the user's email is already verified THEN the row SHALL continue to
   show the green "Verified" badge unchanged.
4. WHEN the resend mutation fails THEN the row SHALL surface the error via
   `toast.error(getApiErrorMessage(err))` per `web-patterns.md` §7 (action-only
   surface, no form).

**Independent Test**: Sign in as an unverified user, open `/settings/profile`,
click the new Resend email button, observe pending → sent state and a fresh
email in the inbox.

---

### P1: Verify panel error state recovers to a working action ⭐ MVP

**User Story**: As a user who lands on `/auth/verify-email` with a missing or
expired token, I want a recovery action that actually fits my auth state, so
that I'm not bounced to the password-reset flow.

**Why P1**: This closes the loop — even after removing the in-app navigations,
the panel is still reachable from a stale or malformed email link, and today's
"Request a new link" CTA points at the wrong feature.

**Acceptance Criteria**:

1. WHEN the verify panel renders its error state AND the user is signed in
   THEN it SHALL show a "Resend email" button wired to
   `useResendEmailVerification` (pending → sent copy, like the banner).
2. WHEN the verify panel renders its error state AND the user is not signed in
   THEN it SHALL show a "Back to sign in" link to `/auth/login` instead of any
   resend CTA (resend requires a session).
3. WHEN the verify panel is in pending or success state THEN its existing
   actions SHALL be unchanged (no button on pending; "Continue" link on
   success).
4. WHEN the resend mutation fails on the panel error state THEN it SHALL
   surface the error via `toast.error(getApiErrorMessage(err))`.

**Independent Test**: Visit `/auth/verify-email` directly while signed out
(see "Back to sign in"), then sign in and visit the same URL (see "Resend
email" with working pending/sent flow).

---

## Edge Cases

- WHEN `useCurrentUser` is still loading on the verify panel THEN the panel
  SHALL render the existing pending state until `user` resolves; the error
  branch SHALL only render once the current-user query has settled.
- WHEN the resend mutation has already succeeded once on the same mount THEN
  the button SHALL stay disabled and show the "Sent" copy until the component
  unmounts or remounts (mirrors the banner behavior; matches the rate-limit
  contract).
- WHEN the email row is shown for a verified user THEN no resend button SHALL
  render (the verified badge is the only action surface).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EVCTAS-01 | P1: Banner | Tasks | Pending |
| EVCTAS-02 | P1: Banner | Tasks | Pending |
| EVCTAS-03 | P1: Banner | Tasks | Pending |
| EVCTAS-15 | P1: Banner | Tasks | Pending (banner toast on resend failure — added during thermo-nuclear review) |
| EVCTAS-04 | P1: Profile | Tasks | Pending |
| EVCTAS-05 | P1: Profile | Tasks | Pending |
| EVCTAS-06 | P1: Profile | Tasks | Pending |
| EVCTAS-07 | P1: Profile | Tasks | Pending |
| EVCTAS-08 | P1: Panel | Tasks | Pending |
| EVCTAS-09 | P1: Panel | Tasks | Pending |
| EVCTAS-10 | P1: Panel | Tasks | Pending |
| EVCTAS-11 | P1: Panel | Tasks | Pending |
| EVCTAS-12 | Edge | Tasks | Pending |
| EVCTAS-13 | Edge | Tasks | Pending |
| EVCTAS-14 | Edge | Tasks | Pending |

**Coverage:** 15 total, all mapped (EVCTAS-15 added during the thermo-nuclear
review and resolved by the same composed-component consolidation).

---

## Success Criteria

- [ ] The unverified-user flow contains zero CTAs that navigate to
      `/auth/verify-email` with an empty token.
- [ ] Banner, settings/profile row, and panel error state each offer a working
      remediation (resend or sign-in) within the same page.
- [ ] `bun check` is green; oxlint is clean under `CI=1`.
