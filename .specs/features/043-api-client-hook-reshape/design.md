# 043 — API-Client Mutation Hook Reshape Design

## Domain-name map (29 hooks)

| File | Domain name |
| ---- | ----------- |
| `identity/use-login.ts` | `login` |
| `identity/use-register.ts` | `register` |
| `identity/use-logout.ts` | `logout` |
| `identity/use-confirm-email-verification.ts` | `confirmEmailVerification` |
| `identity/use-request-password-reset.ts` | `requestPasswordReset` |
| `identity/use-resend-email-verification.ts` | `resendEmailVerification` |
| `identity/use-reset-password.ts` | `resetPassword` |
| `identity/use-revoke-other-sessions.ts` | `revokeOtherSessions` |
| `identity/use-revoke-session.ts` | `revokeSession` |
| `identity/use-switch-workspace.ts` | `switchWorkspace` |
| `workspace/use-invite-member.ts` | `inviteMember` |
| `workspace/use-accept-invitation.ts` | `acceptInvitation` |
| `workspace/use-update-member-status.ts` | `updateMemberStatus` |
| `cadence/use-create-cadence.ts` | `createCadence` |
| `cadence/use-create-template.ts` | `createTemplate` |
| `cadence/use-delete-cadence.ts` | `deleteCadence` |
| `cadence/use-delete-template.ts` | `deleteTemplate` |
| `cadence/use-update-cadence.ts` | `updateCadence` |
| `cadence/use-update-template.ts` | `updateTemplate` |
| `channel/use-connect-meta-coex.ts` | `connectMetaCoex` |
| `channel/use-create-channel-account.ts` | `createChannelAccount` |
| `channel/use-grant-channel-access.ts` | `grantChannelAccess` |
| `channel/use-revoke-channel-access.ts` | `revokeChannelAccess` |
| `channel/use-set-primary-channel.ts` | `setPrimaryChannel` |
| `crm/use-create-connector-account.ts` | `createConnectorAccount` |
| `engine/use-create-entry-trigger.ts` | `createEntryTrigger` |
| `engine/use-delete-entry-trigger.ts` | `deleteEntryTrigger` |
| `engine/use-pause-owner-journeys.ts` | `pauseOwnerJourneys` |
| `engine/use-reassign-leads.ts` | `reassignLeads` |

## Hook transform (every file follows this exact shape)

Before:

```ts
return useMutation({
  mutationFn: ...,
  ...options,
  onSuccess: async (...args) => {
    await queryClient.invalidateQueries({ queryKey: [...] })
    await options?.onSuccess?.(...args)
  },
})
```

After:

```ts
const { mutate, ...rest } = useMutation({
  mutationFn: ...,
  ...options,
  onSuccess: async (...args) => {
    await queryClient.invalidateQueries({ queryKey: [...] })
    await options?.onSuccess?.(...args)
  },
})
return { ...rest, <domainName>: mutate }
```

## Call-site transform pattern

Per-call-site choice based on what reads cleaner:

**A. Destructure** (preferred when the call site only uses a few fields):

Before:
```ts
const login = useLogin({ onSuccess })
login.mutate(input)
login.isPending
login.error
```

After:
```ts
const { login, isPending, isError, error } = useLogin({ onSuccess })
login(input)
```

**B. Keep object** (preferred when many fields are referenced):

Before:
```ts
const reset = useResetPassword()
reset.mutate(...)
reset.isPending
reset.isError
reset.error
reset.isSuccess
```

After:
```ts
const reset = useResetPassword()
reset.resetPassword(...)
reset.isPending
// rest unchanged
```

The rule allows both — the load-bearing change is that `<domainName>`
replaces `mutate` on the returned object.

## Execution mechanics

1. Hook side: 29 manual edits (each is the same 3-line transform). I'll
   use a script that reads each file and applies a regex transform — the
   pattern is identical across all 29 hooks. Validate by typecheck.
2. Call-site side: after the hook reshape, every `.mutate(` usage
   against a reshaped hook becomes a type error. Walk the typecheck
   failures and rename each `.mutate(` → `.<domainName>(`, OR
   destructure where the rename reads worse than the destructure.

## Risks

- Per-call `mutate(input, options)` second-arg pattern (e.g.
  `logout.mutate(undefined, { onSuccess })`). After reshape:
  `logout(undefined, { onSuccess })` or
  `logout.logout(undefined, { onSuccess })` — TanStack's mutate signature
  is the same.
- TanStack types: `mutate: UseMutateFunction<TData, TError, TVariables>`
  — preserving via `{ ...rest, login: mutate }` keeps the type
  intact; the consumer sees `login: UseMutateFunction<...>`.
