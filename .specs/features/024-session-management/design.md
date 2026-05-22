# Session Management UX Design

**Spec**: `.specs/features/024-session-management/spec.md`
**Status**: Approved

---

## Architecture Overview

Three user-scoped use-cases over the existing `sessions` table, behind a new
authed `SessionController`, surfaced by a web security screen. The auth guard
gains a coalesced last-seen touch so the list shows real activity.

```mermaid
graph TD
    GUARD[AuthGuard] -->|coalesced touch| TOUCH[SessionRepository.touchLastSeen]
    SCREEN[/workspace/security] --> LIST[useSessions GET /auth/sessions]
    SCREEN --> REVOKE[useRevokeSession DELETE /auth/sessions/:id]
    SCREEN --> OTHERS[useRevokeOtherSessions DELETE /auth/sessions]
    LIST --> LUC[ListSessionsUseCase]
    REVOKE --> RUC[RevokeSessionUseCase]
    OTHERS --> OUC[RevokeOtherSessionsUseCase]
    LUC --> REPO[(sessions)]
    RUC --> REPO
    OUC --> REPO
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                  | Location                                              | How to Use                          |
| -------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `SessionRepository`        | `identity/persistence/session.repository.ts`          | Add list/touch/scoped-revoke methods |
| `sessions` schema          | `db/schemas/sessions.ts`                              | Add `lastSeenAt` column             |
| `@CurrentSession` / `ActiveSession` | `http/decorators/current-session.decorator.ts` | Identify the current session        |
| `AuthGuard`                | `http/guards/auth.guard.ts`                           | Coalesced `lastSeenAt` touch        |
| `ApplicationException`     | `nestjs-shared`                                       | `SessionNotFoundException` (404/422) |
| `members` table UI pattern | `apps/web/.../features/workspace` + `table` primitive | Mirror for the sessions table       |
| api-client query+mutation patterns | `use-current-user`, `use-logout`              | Mirror list + revoke hooks          |

### Integration Points

| System       | Integration Method                                              |
| ------------ | --------------------------------------------------------------- |
| `AuthGuard`  | After resolving the session, touch last-seen if stale (~5 min)  |
| App shell    | New "Security" nav link → `/workspace/security` route           |

---

## Components

### Schema: `sessions.lastSeenAt`

- **Purpose**: Record coalesced last activity per session.
- **Location**: `db/schemas/sessions.ts` (+ generated migration via `bun db:generate`)
- **Type**: `timestamp({ withTimezone: true })` nullable.

### `SessionRepository` additions

- `listActiveForUser(userId): Session[]` — not revoked, not expired, newest activity first.
- `touchLastSeen(id, seenAt): void` — set `lastSeenAt`.
- `revokeForUser(userId, sessionId): number` — revoke a session scoped to the user; returns affected count for ownership enforcement.
- `revokeOthersForUser(userId, exceptId): void` — revoke all the user's active sessions except one.

### Use-cases

- **`ListSessionsUseCase`**: `execute(userId, currentSessionId): SessionView[]` — maps rows to the view + `isCurrent`.
- **`RevokeSessionUseCase`**: `execute(userId, sessionId)` — `revokeForUser`; if 0 affected → `SessionNotFoundException`.
- **`RevokeOtherSessionsUseCase`**: `execute(userId, currentSessionId)` — `revokeOthersForUser`.

### `SessionController`

- **Purpose**: authed REST surface.
- **Location**: `http/controllers/session.controller.ts`
- **Routes**: `GET /auth/sessions`, `DELETE /auth/sessions/:sessionId`, `DELETE /auth/sessions`.

### Web: security screen

- **`SessionsTable`** + `/workspace/security` route, "log out other sessions" button.
- **Reuses**: `table` primitive, `Button`, `useSessions` / `useRevokeSession` / `useRevokeOtherSessions`.

---

## Data Models

### `SessionView` (contract)

```typescript
interface SessionView {
  id: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string // iso datetime
  lastSeenAt: string | null
  expiresAt: string
  isCurrent: boolean
}
```

**Relationships**: a projection of `sessions` rows for the authenticated user.

---

## Error Handling Strategy

| Error Scenario                       | Handling                                  | User Impact                         |
| ------------------------------------ | ----------------------------------------- | ----------------------------------- |
| Revoke a session not owned / missing | `SessionNotFoundException` (422)          | Row error toast; list unchanged     |
| Malformed session id                 | `ZodValidationPipe` (uuid) → 422          | Validation error                    |
| Unauthenticated                      | `AuthGuard` → 401                         | Redirected to login                 |

---

## Tech Decisions (only non-obvious ones)

| Decision                  | Choice                                  | Rationale                                                     |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Last-seen freshness       | Coalesced touch in guard (~5 min)       | Real last-seen without a DB write on every authed request     |
| Log-out-everywhere verb   | `DELETE /auth/sessions` (keep current)  | REST collection delete; you cannot delete the session in use  |
| Revoke ownership          | Scoped repo update + affected-count check | Enforces ownership in one query; no separate fetch+compare    |
| Revoking the current one   | Allowed, no special case               | Simpler flow; the user just gets logged out                   |
</content>
