# 043 — API-Client Mutation Hook Reshape Specification

## Problem Statement

Feature 041 shipped ADR-007 + web-patterns.md prescribing that mutation
hooks return `{ <domainName>: mutate, ...rest }` (so call sites read
`login(input)` not `login.mutate(input)`). Existing hooks were left on
the raw TanStack shape under the rule's transition clause. The user
asked for the full sweep — reshape every mutation hook and update every
caller to use the domain-named action.

Pre-audit found that **invalidation is already correctly centralized**
in every hook with chained `options?.onSuccess?.(...args)` — so the
remaining work is purely the return-shape change.

## Goals

- [ ] All 29 mutation hooks under `packages/api-client/src/**/use-*.ts`
  return `{ ...rest, <domainName>: mutate }` per ADR-007 / web-patterns
  §8.
- [ ] Every call site under `apps/web/` uses the domain-named action
  (`login(input)`, `createCadence(body)`, etc.); zero `xxx.mutate(...)`
  references against an api-client mutation hook remain.
- [ ] `bun check` is green; existing web tests stay passing.
- [ ] Chrome smoke green on every mutation-bearing surface (login,
  signup, password reset, accept invite, logout, switch workspace,
  invite member, update member status, create cadence/template, delete
  cadence/template, create/grant/revoke channel access, set primary
  channel, create connector account, create/delete entry trigger,
  pause-owner-journeys, reassign-leads, resend email verification).
- [ ] No behavior change — pure refactor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Query hook shape | Query hooks already match the rule (no `mutate`). |
| New tests | Test-bootstrap is a separate concern. |
| Anything outside `packages/api-client/` and `apps/web/` | Web-only refactor. |
| Tweaks to invalidation logic | Already correct per audit. |

## User Stories

### P1: Every mutation hook follows the doctrine ⭐ MVP

**User Story**: As a contributor (human or agent), I want every existing
mutation hook to return `{ <domainName>: mutate, ...rest }` and every
call site to invoke the domain name, so the codebase is uniform and the
rule no longer needs a "mixed shapes tolerated" disclaimer.

**Acceptance Criteria**:

1. WHEN any `packages/api-client/src/**/use-<verb>-<entity>.ts` is read
   THEN the returned object SHALL be `{ ...rest, <domainName>: mutate }`
   (with `mutate` destructured out of `useMutation()`).
2. WHEN any call site under `apps/web/` invokes a mutation THEN it SHALL
   call `<domainName>(input)` (after destructuring or via the returned
   object), NOT `xxx.mutate(input)`.
3. WHEN `bun check` runs THEN it SHALL be green.
4. WHEN Chrome smoke runs on the mutation-bearing surfaces THEN every
   surface SHALL behave identically to pre-reshape.

## Edge Cases

- Hooks where the call site's local variable happens to differ from the
  domain name (e.g. `const accept = useAcceptInvitation()`,
  `accept.mutate(...)`) — destructure at the call site:
  `const { acceptInvitation, ...rest } = useAcceptInvitation()`.
- Hooks where the call site passes per-call `onSuccess` to
  `mutate({...}, { onSuccess })` (e.g. `logout`) — the new
  `<domainName>(input, options)` accepts the same second argument; no
  behavior change.
- `useResendEmailVerification` is invoked with no payload
  (`resend.mutate()`); after reshape becomes
  `resendEmailVerification()` — TanStack's `mutate` accepts `void`
  implicitly when the input is `void`.

## Success Criteria

- [ ] All 29 hooks reshaped.
- [ ] Zero `\.mutate\(` against api-client mutation results across
  `apps/web/`.
- [ ] `bun check` green; web tests pass.
- [ ] Chrome smoke green: login, logout, signup form submit,
  forgot-password submit, accept-invite click, workspace-switcher click,
  member invite (if reachable), command-palette logout, email
  verification resend.
