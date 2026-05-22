# Web `/auth/*` Route Prefix Design

**Spec**: `.specs/features/026-auth-route-prefix/spec.md`
**Status**: Approved

---

## Architecture Overview

A mechanical move: rename the pathless route group directory `(auth)` → `auth` so the
segment becomes part of the URL, regenerate the TanStack route tree, then update every
inbound reference (in-app navigations + server-generated links).

---

## Code Reuse Analysis

No new components. Touch points:

| Reference                                  | Location                                                     | Change                                  |
| ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------- |
| Auth route files                           | `apps/web/src/routes/(auth)/*`                               | Move to `routes/auth/*`; update `createFileRoute` paths |
| Protected-route redirect                   | `apps/web/src/routes/_app/route.tsx`                         | `/login` → `/auth/login`                |
| Logout navigation                          | `apps/web/src/features/app-shell/components/app-shell.tsx`   | `/login` → `/auth/login`                |
| OAuth login-error redirect                 | `apps/api/.../http/controllers/oauth.controller.ts`          | `${webUrl}/login` → `${webUrl}/auth/login` |
| Email verification link                    | `apps/api/.../core/use-cases/request-email-verification.use-case.ts` | `${appUrl}/verify-email` → `${webUrl}/auth/verify-email` |
| Route tree                                 | `apps/web/src/routeTree.gen.ts`                              | Regenerate via `tsr generate`           |

---

## Components

No component changes — only route paths and link strings.

---

## Error Handling Strategy

Unchanged. The OAuth callback still redirects business errors to the login page; only
the path string changes.

---

## Tech Decisions (only non-obvious ones)

| Decision                          | Choice                          | Rationale                                                  |
| --------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| Verification link origin          | `webUrl` (not `appUrl`)         | The verify page is a web route; the prior `appUrl` pointed at the API and only worked same-origin |
| Group → real segment              | Rename `(auth)` → `auth`        | TanStack file-routing: parens = pathless; a plain folder adds the URL segment |
</content>
