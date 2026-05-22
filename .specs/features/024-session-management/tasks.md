# Session Management UX Tasks

**Design**: `.specs/features/024-session-management/design.md`
**Status**: In Progress

---

## Execution Plan

### Phase 1: Schema + repository (Sequential)

```
T1 → T2
```

### Phase 2: Domain + last-seen (Sequential — share repo)

```
T2 → T3 → T4
```

### Phase 3: API surface (Sequential)

```
T4 → T5 → T6
```

### Phase 4: Web (Sequential)

```
T6 → T7
```

---

## Task Breakdown

### T1: Add `sessions.lastSeenAt` + migration

**What**: Add nullable `lastSeenAt` to the sessions schema and regenerate the migration.
**Where**: `apps/api/src/db/schemas/sessions.ts`, `apps/api/drizzle/*` (generated)
**Depends on**: None
**Reuses**: `defaults()` timestamp pattern
**Requirement**: SESSMGT-03

**Done when**:

- [ ] `lastSeenAt` column added; `bun db:generate` produces a migration + checksum
- [ ] `bun scripts/drizzle-checksums.ts verify` passes
- [ ] Typecheck passes

**Tests**: none (schema)
**Gate**: build

---

### T2: `SessionRepository` list/touch/scoped-revoke methods

**What**: Add `listActiveForUser`, `touchLastSeen`, `revokeForUser` (affected count), `revokeOthersForUser`.
**Where**: `identity/persistence/session.repository.ts`
**Depends on**: T1
**Reuses**: existing `revoke`/`revokeAllForUser` query style
**Requirement**: SESSMGT-01, SESSMGT-04, SESSMGT-07

**Done when**:

- [ ] `listActiveForUser` returns only not-revoked, not-expired rows, newest-activity first
- [ ] `revokeForUser` returns affected count (0 when not owned)
- [ ] Integration test proves ownership scoping + active filtering
- [ ] Full gate passes

**Tests**: integration
**Gate**: full

---

### T3: Three session use-cases

**What**: `ListSessionsUseCase`, `RevokeSessionUseCase`, `RevokeOtherSessionsUseCase` + `SessionNotFoundException`.
**Where**: `identity/core/use-cases/*`, `core/errors/identity.errors.ts`
**Depends on**: T2
**Reuses**: repository methods, `ApplicationException`
**Requirement**: SESSMGT-02, SESSMGT-05, SESSMGT-06, SESSMGT-08

**Done when**:

- [ ] List maps rows to `SessionView` with `isCurrent`
- [ ] Revoke throws `SessionNotFoundException` when affected count is 0
- [ ] Revoke-others keeps the current session
- [ ] Unit tests cover the mapping + the not-owned branch + the keep-current rule
- [ ] Quick gate passes

**Tests**: unit
**Gate**: quick

---

### T4: Coalesced last-seen touch in `AuthGuard`

**What**: After resolving a session, touch `lastSeenAt` only when stale (~5 min).
**Where**: `http/guards/auth.guard.ts`
**Depends on**: T2
**Reuses**: loaded session, `SessionRepository.touchLastSeen`
**Requirement**: SESSMGT-03

**Done when**:

- [ ] Touch fires when `lastSeenAt` is null or older than the threshold; skipped otherwise
- [ ] Existing auth e2e still green
- [ ] Quick gate passes

**Tests**: none (thin guard branch; observable via list e2e)
**Gate**: quick

---

### T5: Session contracts + `Routes` entries

**What**: `SessionViewSchema` + `SessionsResponseSchema`; `Routes.auth.sessions` + `session(id)`.
**Where**: `api-contracts/identity/sessions.contract.ts`, `routes/index.ts`, `identity/index.ts`
**Depends on**: None
**Reuses**: contract + Routes pattern
**Requirement**: SESSMGT-01

**Done when**:

- [ ] Schema + types exported; static + parameterized routes declared
- [ ] Typecheck passes across packages

**Tests**: none (contract types)
**Gate**: build

---

### T6: `SessionController` + module wiring + api-client

**What**: `GET /auth/sessions`, `DELETE /auth/sessions/:sessionId`, `DELETE /auth/sessions`; register controller + use-cases; client calls + hooks.
**Where**: `http/controllers/session.controller.ts`, `identity.module.ts`, `api-client/identity/sessions.api.ts` (or extend `auth.api.ts`), `use-sessions.ts`, `use-revoke-session.ts`, `use-revoke-other-sessions.ts`, `query-keys.ts`
**Depends on**: T3, T4, T5
**Reuses**: `@CurrentSession`, `@CurrentUser`, password-reset controller shape
**Requirement**: SESSMGT-01, SESSMGT-04, SESSMGT-07

**Done when**:

- [ ] List returns the caller's sessions (current flagged); revoke-one and revoke-others enforce per spec
- [ ] e2e: two sessions list with one current; revoke B → B's `me` 401, A works; revoke-others keeps current; revoke not-owned → 422
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

---

### T7: Security screen

**What**: `SessionsTable` + `/workspace/security` route + "log out other sessions" action + nav link.
**Where**: `apps/web/src/features/identity/components/sessions-table.tsx`, `routes/_app/workspace/security.tsx`, `app-shell.tsx` (nav link)
**Depends on**: T6
**Reuses**: `table` primitive, `Button`, the three hooks
**Requirement**: SESSMGT-09

**Done when**:

- [ ] Lists sessions (current marked), revoke per row, log-out-others button; list refreshes on success
- [ ] Build + typecheck pass

**Tests**: none (thin; behavior covered by e2e)
**Gate**: build

**Commit**: `feat(api): session management (list, revoke, log out everywhere)`

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | schema | none | none | ✅ OK |
| T2 | repository (query logic) | integration | integration | ✅ OK |
| T3 | use-cases (fat) | unit | unit | ✅ OK |
| T4 | guard branch (thin) | none | none | ✅ OK |
| T5 | contract types | none | none | ✅ OK |
| T6 | controller (thin) + wiring | e2e | e2e | ✅ OK |
| T7 | web (thin) | none | none | ✅ OK |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| ---- | ---------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T2 | guard→touch (T2 method) | ✅ Match |
| T5 | None | (parallelizable; folded into Phase 3) | ✅ Match |
| T6 | T3, T4, T5 | use-cases→controller | ✅ Match |
| T7 | T6 | screen→hooks | ✅ Match |
</content>
