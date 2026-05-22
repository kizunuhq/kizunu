# Self-host Registration Gate Design

**Spec**: `.specs/features/022-self-host-registration-gate/spec.md`
**Status**: Approved

---

## Architecture Overview

A single env-backed boolean flows from config into one domain guard and one
public read endpoint. The web app reflects it instead of hardcoding a switch.

```mermaid
graph TD
    ENV[DISABLE_USER_REGISTRATION env] --> CFG[api.config auth.registrationDisabled]
    CFG --> GUARD[RegisterUserUseCase guard]
    CFG --> CAP[GET /auth/capabilities]
    GUARD -->|gate on| ERR[RegistrationDisabledException 422]
    CAP --> HOOK[useAuthCapabilities]
    HOOK --> SIGNUP[(auth)/signup route]
    SIGNUP -->|enabled| FORM[SignupForm]
    SIGNUP -->|disabled| NOTICE[RegistrationDisabledNotice]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                    | Location                                                  | How to Use                          |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------- |
| Nested config object pattern | `apps/api/src/api.config.ts` (`session`, `meta`)         | Add `auth` object alongside         |
| `ApplicationException`       | `nestjs-shared/lib/exceptions/application.exception`     | Subclass for the gate error         |
| `@Public()` + `ConfigService`| `auth.controller.ts`                                     | Public capability endpoint          |
| `LoginForm`                  | `apps/web/.../identity/components/login-form.tsx`        | Mirror for `SignupForm`             |
| `useCurrentUser`             | `@kizunu/api-client/identity/use-current-user`           | Mirror query hook for capabilities  |
| `Card` primitives + `Button` | `apps/web/src/components/primitives`                     | Compose the form + notice           |

### Integration Points

| System              | Integration Method                                           |
| ------------------- | ------------------------------------------------------------ |
| `RegisterUserUseCase` | Guard clause at the top of `execute()`, before any DB access |
| Type-safe boundary  | New contract + `Routes` entry → `*.api.ts` → `use-*.ts` hook  |

---

## Components

### Config: `auth.registrationDisabled`

- **Purpose**: Carry the env toggle into typed config.
- **Location**: `apps/api/src/api.config.ts`
- **Interfaces**: `config.get('auth.registrationDisabled'): boolean`
- **Reuses**: existing `load()` + nested-object schema pattern.

### `RegistrationDisabledException`

- **Purpose**: Business-rule error rendered as 422.
- **Location**: `apps/api/src/modules/identity/core/errors/identity.errors.ts`
- **Interfaces**: `new RegistrationDisabledException()` → code `identity.registration-disabled`.
- **Reuses**: `ApplicationException`.

### `RegisterUserUseCase` guard

- **Purpose**: Reject registration before any side effect when gated.
- **Location**: `register-user.use-case.ts`
- **Reuses**: injected `ConfigService`.

### Capability endpoint + contract + hook

- **Purpose**: Expose `{ registrationEnabled }` publicly; consume on the web.
- **Locations**: `auth.controller.ts`, `api-contracts/identity/capabilities.contract.ts`,
  `Routes.auth.capabilities`, `api-client/identity/auth.api.ts` + `use-auth-capabilities.ts`.

### Web: `SignupForm`, `RegistrationDisabledNotice`, signup route

- **Purpose**: Render the form when open, the notice when closed.
- **Locations**: `apps/web/src/features/identity/components/*`, `routes/(auth)/signup.tsx`.
- **Reuses**: `LabeledInput`, `useRegister`, `useCurrentUser`.

---

## Error Handling Strategy

| Error Scenario                     | Handling                                  | User Impact                         |
| ---------------------------------- | ----------------------------------------- | ----------------------------------- |
| Register while gated               | `RegistrationDisabledException` (422)     | Signup page shows the disabled state |
| Capability fetch fails (network)   | `data` undefined → fall through to notice | Fail-closed: disabled notice shown   |
| Invalid env (non-bool string)      | `z.stringbool` parse fails → boot error   | Operator fixes config at deploy      |

---

## Tech Decisions (only non-obvious ones)

| Decision               | Choice          | Rationale                                                        |
| ---------------------- | --------------- | ---------------------------------------------------------------- |
| Env boolean coercion   | `z.stringbool()`| `z.coerce.boolean()` maps the string `"false"` to `true` — wrong for a security toggle |
| Capability shape       | `{ registrationEnabled }` object | Extensible for future auth capabilities (e.g. OAuth providers) without a breaking change |
</content>
