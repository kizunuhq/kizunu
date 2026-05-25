# 055 — Fix Email-Verification CTAs Tasks

**Spec**: `.specs/features/055-fix-email-verification-ctas/spec.md`
**Design**: skipped (UX bug-fix, no architectural decisions)
**Status**: Done (T1–T4 complete; `bun check` green — 490/490 tests)

---

## Execution Plan

### Phase 1: Web edits (sequential — same area, share reviewability)

```
T1 → T2 → T3
```

### Phase 2: Gate

```
T4
```

Three small `.tsx` edits, then one `bun check`. Tasks aren't `[P]` because
they're in the same surface (auth + shell) and the gate is shared — running
them serially keeps the diff easy to review and avoids any
sub-agent context juggling for ~30 lines of code total.

---

## Task Breakdown

### T1: Remove "Open verify page" link from EmailVerificationBanner

**What**: Delete the `<Link to="/auth/verify-email" search={{ token: '' }}>`
block from the banner. Keep the headline, description, "Change email" link,
and "Resend email" button untouched. Drop the now-unused `Link` import if no
other `<Link>` remains; otherwise keep it.

**Where**: `apps/web/src/_shell/app-shell/email-verification-banner.tsx`

**Depends on**: None
**Reuses**: existing `useResendEmailVerification`, `Link` import, banner copy.
**Requirements**: EVCTAS-01, EVCTAS-02, EVCTAS-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No `Link` to `/auth/verify-email` in the banner.
- [ ] "Resend email" button behavior is unchanged (still uses
      `resend.isPending` / `resend.isSuccess` for copy + disabled).
- [ ] Component still under 50 lines.

**Tests**: none (thin component; covered by browser e2e per TESTING.md
"Web components / hooks (thin)" row).
**Gate**: build (`bun typecheck`).

---

### T2: Replace settings/profile "Verify" button with Resend email

**What**: In the email row of `ProfilePage`, when `!isVerified`, render a
small Resend button (instead of the broken Link) that calls
`useResendEmailVerification` with `onError: (err) => toast.error(getApiErrorMessage(err))`.
Copy: `Sending…` while pending, `Sent` on success, `Resend email` otherwise.
Disable while pending or after success. Verified branch (green dot + "Verified")
stays as-is. Helper extracted to `-components/email-row-action.tsx` if the
inline JSX pushes `ProfilePage` past the 50-line ceiling.

**Where**:
- `apps/web/src/routes/_app/settings/profile/index.tsx` (modify)
- `apps/web/src/routes/_app/settings/profile/-components/email-row-action.tsx`
  (new — extract only if the smart page would exceed 50 lines after the edit)

**Depends on**: T1 (decoupled, but T1 lands the doctrine — banner first, then
mirror it on profile)
**Reuses**: `useResendEmailVerification`, `Button` primitive,
`getApiErrorMessage`, `toast` from sonner (same as other CRUD pages, e.g.
`routes/_app/workspace/cadences/-dialogs/*`).
**Requirements**: EVCTAS-04, EVCTAS-05, EVCTAS-06, EVCTAS-07, EVCTAS-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No `Link` to `/auth/verify-email` in `profile/index.tsx`.
- [ ] Resend button cycles through `Resend email` → `Sending…` → `Sent` and
      stays disabled on success.
- [ ] Failure path toasts the error via `getApiErrorMessage` (per
      web-patterns.md §7, "action-only" surface).
- [ ] Verified branch is byte-identical (same green dot, same copy).
- [ ] `ProfilePage` stays ≤50 lines (extract `EmailRowAction` if needed).

**Tests**: none (thin UI orchestration; the resend hook itself is one
mutation passthrough — fat coverage is on the API resend use case).
**Gate**: build (`bun typecheck`).

---

### T3: Verify panel error CTA: resend if signed in, sign-in link otherwise

**What**: In `VerifyEmailPanel`, when `state === 'error'`:
- gate on `useCurrentUser().user` (only resolved truthy → signed in).
- signed in → render a Resend email Button (`useResendEmailVerification`
  with `onError → toast.error(getApiErrorMessage(err))`), same
  `Resend email` / `Sending…` / `Sent` copy and disabled-on-success behavior
  as T1/T2.
- not signed in → render a `Link to="/auth/login"` styled with
  `buttonVariants({ variant: 'outline' })` and the label "Back to sign in".
- Pending and success branches unchanged (no resend on pending; "Continue"
  link on success).

**Where**: `apps/web/src/routes/auth/verify-email/-components/verify-email-panel.tsx`

**Depends on**: T2 (reuses the same resend-CTA pattern landed on profile)
**Reuses**: `useCurrentUser`, `useResendEmailVerification`, `Button`
primitive, `buttonVariants`, `getApiErrorMessage`, `toast` from sonner.
**Requirements**: EVCTAS-08, EVCTAS-09, EVCTAS-10, EVCTAS-11, EVCTAS-12, EVCTAS-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No remaining link from this panel to `/auth/forgot-password`.
- [ ] Signed-in error state: Resend email button works (cycles
      Resend → Sending… → Sent; disabled after success).
- [ ] Signed-out error state: "Back to sign in" link points to `/auth/login`.
- [ ] Pending and success branches untouched.
- [ ] Component still ≤50 lines (extract a small `VerifyErrorActions` sibling
      if not).

**Tests**: none (thin UI orchestration). Confirm with `generate-tests` before
shipping.
**Gate**: build (`bun typecheck`).

---

### T4: Definition-of-Done gate

**What**: Run the full local gate; fix anything red.

**Where**: repo root.

**Depends on**: T1, T2, T3
**Reuses**: `bun check` orchestrator.
**Requirements**: (covers all)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `bun check` exits 0 (typecheck + vp check + script-gated rules).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.

**Tests**: none added (per generate-tests classification on T1–T3).
**Gate**: full (`bun check`).

---

## Parallel Execution Map

```
Phase 1 (sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (gate):
  T1, T2, T3 done → T4
```

No `[P]` flags. The web project is parallel-safe per TESTING.md, but the
serial order keeps the diff coherent within one auth/identity surface, and
the only gate (`bun check`) runs once at the end.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Banner CTA removal | 1 file edit | ✅ Granular |
| T2: Profile row replacement | 1 file edit (+ optional 1 sibling component) | ✅ Granular |
| T3: Panel error CTA | 1 file edit | ✅ Granular |
| T4: Local gate | 1 command | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | nothing → T1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1, T2, T3 | T1, T2, T3 → T4 | ✅ Match |

---

## Test Co-location Validation

TESTING.md's Test Coverage Matrix row for "Web components / hooks (thin)"
says: **none (browser e2e covers them)**. Every code layer touched here is
thin UI orchestration (a banner CTA removal, a Resend button wrapper, a panel
error branch). `useResendEmailVerification` is a one-line wrapper around a
mutation function — fat coverage is on the API resend use case, not the hook.

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Banner (thin component) | none | none | ✅ OK |
| T2 | Profile row + optional thin sibling | none | none | ✅ OK |
| T3 | Panel error branch (thin) | none | none | ✅ OK |
| T4 | n/a (gate) | n/a | none | ✅ OK |

`generate-tests` will be invoked once after implementation to re-confirm the
thin/fat classification on the actual diff (not on plan-time guesses).

---

## Commit Plan

- T1 → `fix(web): remove dead-end Open verify page link from email banner`
- T2 → `fix(web): replace settings/profile Verify CTA with Resend email`
- T3 → `fix(web): wire verify-email panel error state to resend or sign-in`
- (T4 produces no commit on its own.)
