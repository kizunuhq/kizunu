# Per-BDR WhatsApp number routing — Tasks

## T1 — Contract

`packages/api-contracts/src/workspace/routing-readiness.contract.ts`
exports `RoutingReadinessSchema` + inferred type. `Routes.workspaces`
gains `routingReadiness(workspaceId)`.

## T2 — Dispatcher no-fallback smoke test

Add `apps/api/src/modules/channel/persistence/__test__/integration/channel-access.repository.routing.spec.ts`
asserting that `findPrimaryAccount(userA, pluginId)` returns A's
primary when both A and B have primaries in the same workspace, and
returns `undefined` when A has none.

## T3 — Use case

`GetRoutingReadinessUseCase` reads memberships + their channel-access
rows + primary flags. Returns `RoutingReadinessResponse`.

## T4 — Controller

New `routing-readiness.controller.ts` exposes
`GET /workspaces/:id/routing-readiness` under `WorkspaceAdminGuard`.

## T5 — Web — hook + panel + integration

- `@kizunu/api-client/workspace/use-routing-readiness.ts`.
- `apps/web/src/routes/_app/settings/members/-components/routing-readiness-panel.tsx`.
- Wire into the members page.

## T6 — Docs

ROADMAP + STATE.
