# Email Verification Design

**Spec**: `.specs/features/023-email-verification/spec.md`
**Status**: Approved

---

## Architecture Overview

Mirrors the password-reset slice (`020`): two use-cases over the existing
`verification_tokens` table + `MailSender`, a dedicated controller, contracts +
client hooks, and a thin web surface. Register composes the request use-case so
verification is part of the register behavior.

```mermaid
graph TD
    REG[RegisterUserUseCase] -->|after commit| REQ[RequestEmailVerificationUseCase]
    RESEND[POST /auth/email-verification authed] --> REQ
    REQ --> TOK[(verification_tokens email_verification)]
    REQ --> MAIL[MailSender link verify-email?token]
    MAIL --> CONF[POST /auth/email-verification/confirm public]
    CONF --> CONFUC[ConfirmEmailVerificationUseCase]
    CONFUC --> USERS[(users.emailVerifiedAt)]
    USERS --> ME[GET /auth/me emailVerifiedAt]
    ME --> BANNER[EmailVerificationBanner]
    CONF --> VERIFY[/verify-email route]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                       | Location                                                  | How to Use                       |
| ------------------------------- | -------------------------------------------------------- | -------------------------------- |
| `RequestPasswordResetUseCase`   | `request-password-reset.use-case.ts`                     | Mirror for request/resend        |
| `ResetPasswordUseCase`          | `reset-password.use-case.ts`                             | Mirror for confirm               |
| `PasswordResetController`       | `http/controllers/password-reset.controller.ts`          | Mirror for the new controller    |
| `VerificationTokenRepository`   | `workspace/persistence/verification-token.repository.ts` | `create` / `findActiveByHashedToken` / `markConsumed` |
| `MailSender` (`ConsoleMailSender`) | `core/mail/*`                                          | Out-of-band link delivery        |
| `email_verification` enum + `users.emailVerifiedAt` | db schemas                            | Existing columns, no migration   |
| `opaque-token.helper`           | `shared/crypto/opaque-token.helper`                      | `generateOpaqueToken` / `hashOpaqueToken` |
| `me` already returns `emailVerifiedAt` | `get-me.use-case.ts`, `me.contract.ts`            | Drives the banner, no change     |

### Integration Points

| System                | Integration Method                                              |
| --------------------- | --------------------------------------------------------------- |
| `RegisterUserUseCase` | Injects `RequestEmailVerificationUseCase`, calls it post-commit |
| App shell             | `EmailVerificationBanner` rendered above `<Outlet />`           |
| `(auth)` layout       | Unguarded centered container hosts `/verify-email`              |

---

## Components

### `RequestEmailVerificationUseCase`

- **Purpose**: Mint a single-use token and mail the verify link; no-op if user missing/verified.
- **Location**: `core/use-cases/request-email-verification.use-case.ts`
- **Interfaces**: `execute(userId: string): Promise<void>`
- **Reuses**: `UserRepository`, `VerificationTokenRepository`, `MailSender`, `ConfigService`.

### `ConfirmEmailVerificationUseCase`

- **Purpose**: Consume token, set `emailVerifiedAt`.
- **Location**: `core/use-cases/confirm-email-verification.use-case.ts`
- **Interfaces**: `execute(token: string): Promise<void>` — throws `InvalidVerificationTokenException`.
- **Reuses**: `UserRepository.markEmailVerified`, `VerificationTokenRepository`.

### `EmailVerificationController`

- **Purpose**: `POST /auth/email-verification` (authed resend, 204) + `/confirm` (public, 204).
- **Location**: `http/controllers/email-verification.controller.ts`
- **Reuses**: `@CurrentUser`, `@Public`, `AUTH_THROTTLE`, `createZodDto`.

### Web: banner + verify route

- **`EmailVerificationBanner`**: self-contained, reads `useCurrentUser`, renders nothing when verified; resend via `useResendEmailVerification`.
- **`VerifyEmailPanel` + `/verify-email`**: confirms the token on mount via `useConfirmEmailVerification`, shows pending/success/error.

---

## Data Models

No new tables. Reuses:

```typescript
// verification_tokens (type 'email_verification')
// users.emailVerifiedAt: timestamp | null  (set on confirm)
```

---

## Error Handling Strategy

| Error Scenario                       | Handling                                   | User Impact                       |
| ------------------------------------ | ------------------------------------------ | --------------------------------- |
| Invalid/expired/consumed token       | `InvalidVerificationTokenException` (422)  | Verify route shows error + retry  |
| Resend without session               | `UnauthorizedException` (401)              | n/a (authed UI only)              |
| Resend while already verified        | use-case no-op, still 204                  | No new mail, no error             |
| Mail transport failure (future SMTP) | propagates (as password-reset does)        | Tracked in CONCERNS               |

---

## Tech Decisions (only non-obvious ones)

| Decision            | Choice                          | Rationale                                                            |
| ------------------- | ------------------------------- | -------------------------------------------------------------------- |
| Enforcement posture | Soft (no login block) for v0.1  | Preserves register→session pilot flow; nothing concrete to gate yet  |
| Resend identity     | Authenticated (session user)    | No email in body → no account-enumeration surface                    |
| Where register fires verification | Compose use-case post-commit | Keeps "register sends verification" cohesive; mirrors reset posture |
</content>
