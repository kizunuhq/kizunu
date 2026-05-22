# Web `/auth/*` Route Prefix Tasks

**Design**: `.specs/features/026-auth-route-prefix/design.md`
**Status**: In Progress

---

## Execution Plan

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Move the auth route group + regenerate the tree

**What**: Rename `routes/(auth)/` → `routes/auth/`, update each `createFileRoute` path, regenerate the route tree.
**Where**: `apps/web/src/routes/auth/*`, `routeTree.gen.ts`
**Depends on**: None
**Requirement**: AUTHPREFIX-01

**Done when**:

- [ ] Files moved; `createFileRoute('/(auth)/x')` → `createFileRoute('/auth/x')`
- [ ] `tsr generate` produces `/auth/*` routes; typecheck passes

**Tests**: none (routing)
**Gate**: build

---

### T2: Update in-app navigations

**What**: Point protected-route redirect and logout navigation at `/auth/login`.
**Where**: `_app/route.tsx`, `app-shell.tsx`
**Depends on**: T1
**Requirement**: AUTHPREFIX-02, AUTHPREFIX-03

**Done when**:

- [ ] Both navigate to `/auth/login`; typecheck passes (route literal is type-checked)

**Tests**: none (thin)
**Gate**: build

---

### T3: Update server-generated links

**What**: OAuth login-error redirect → `/auth/login`; verification link → `${webUrl}/auth/verify-email`.
**Where**: `oauth.controller.ts`, `request-email-verification.use-case.ts`
**Depends on**: None
**Requirement**: AUTHPREFIX-04, AUTHPREFIX-05

**Done when**:

- [ ] OAuth error redirect uses `/auth/login`
- [ ] Verification link uses `webUrl` + `/auth/verify-email`; the unit spec asserts the new link
- [ ] Existing OAuth + email-verification e2e still green
- [ ] Quick gate passes

**Tests**: unit (verification link spec updated)
**Gate**: full

**Commit**: `refactor(web): move auth pages under /auth/* prefix`

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | web routes | none | none | ✅ OK |
| T2 | web nav (thin) | none | none | ✅ OK |
| T3 | use-case link (fat-ish) + controller | unit | unit | ✅ OK |
</content>
