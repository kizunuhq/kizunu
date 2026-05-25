# Pipedrive connector health check — Specification

## Problem Statement

A Pipedrive connector account that was wired up successfully can break
silently: the API token gets revoked, the company domain gets renamed,
permissions on the deal-fields surface get downgraded. Today the only
signal an operator gets is the journey hitting `error_state` long after
the regression. The pilot operator needs a way to ask the system, **before
launch and on demand**, "is Pipedrive still ready to run this cadence?"

## Goals

- [ ] An operator can call `GET /workspaces/:id/connector-accounts/:accountId/health`
      and receive a structured report of the readiness checks Pipedrive
      requires for the v1.0 pilot.
- [ ] The web settings/connectors row surfaces a small "ready / degraded /
      unreachable" pill with a tooltip listing the failing checks, so the
      operator can spot trouble at a glance.
- [ ] The mechanism lives behind a generic `CRMConnector.checkHealth?`
      hook so a second connector (HubSpot, RD) ships health as a property
      of its own implementation, not a special case in the use-case.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Periodic background health polling | Manual on-demand check is enough for v1.0. |
| Channel-plugin health (WhatsApp Coex token expiry etc.) | Separate slice — feature 061 (WhatsApp CoEx setup readiness). |
| Auto-reconnect / auto-retry on failure | Out of scope; recovery is operator-driven in v1.0. |
| Caching / debouncing the health response | Cost is low (3 Pipedrive requests). Cache when usage warrants. |
| Editing the connector from the health surface | Edit is a separate slice; the health row links to the existing edit flow. |

---

## User Stories

### P1: API health endpoint ⭐ MVP

**User Story**: As an operator, I want to GET a structured health report
on a connector account so that I know whether the pilot can run end-to-end.

**Acceptance Criteria**:

1. WHEN the operator authenticates and calls
   `GET /workspaces/:id/connector-accounts/:accountId/health` THEN system
   SHALL return HTTP 200 with body
   `{ overall, checks: [{ id, label, status, detail? }, ...] }` where
   `status ∈ {'ok', 'fail'}` and `overall ∈ {'ready', 'degraded', 'unreachable'}`.
2. WHEN every check returns `status = 'ok'` THEN `overall` SHALL be `'ready'`.
3. WHEN at least one but not every check returns `status = 'fail'` THEN
   `overall` SHALL be `'degraded'`.
4. WHEN the token-validity check fails (cannot reach Pipedrive or the API
   rejects the token) THEN `overall` SHALL be `'unreachable'`. The other
   checks SHALL be reported with the actual status that was observed; the
   endpoint never short-circuits.
5. WHEN the connector account is not found in the workspace THEN system
   SHALL return HTTP 404 with `crm.account-not-found`.
6. WHEN the requested workspace's connector does not implement
   `checkHealth?` THEN system SHALL return HTTP 422 with code
   `crm.health-unsupported`.
7. WHEN the request comes from a non-admin user of the workspace THEN
   system SHALL return HTTP 403 (existing `WorkspaceAdminGuard`).

**Independent Test**: `curl` the endpoint after creating a Pipedrive
connector via the existing test flow; assert the JSON shape.

---

### P1: Pipedrive checks ⭐ MVP

**User Story**: As an operator of a Pipedrive pilot, I want the report to
exercise the specific surfaces the cadence engine depends on so that I
trust the green pill.

**Acceptance Criteria**:

1. The Pipedrive `checkHealth` implementation SHALL emit exactly these
   six checks (in order, id ↔ label):
   - `token` ↔ "API token" — `GET /v1/users/me` does not 401/403.
   - `user` ↔ "User" — `GET /v1/users/me` returns a non-empty
     `data.id` + `data.email`.
   - `pipelines` ↔ "Pipelines" — `GET /v1/pipelines` returns
     `data.length >= 1`.
   - `stages` ↔ "Stages" — `GET /v1/stages` returns `data.length >= 1`
     (a workspace with zero stages cannot run a stage-transition cadence).
   - `fields` ↔ "Deal fields" — `GET /v1/dealFields` returns
     `data.length >= 1`.
   - `webhook` ↔ "Webhook URL" — `credentials.webhookToken` is a non-
     empty string. No network call.
2. WHEN any of the four Pipedrive calls returns 401/403 THEN that check
   SHALL be `fail` with detail `'Pipedrive rejected the API token.'`,
   AND `overall` SHALL be `'unreachable'`.
3. WHEN any of the four Pipedrive calls fails for other reasons
   (network / 5xx / malformed body) THEN that check SHALL be `fail` with a
   short `detail` describing what was attempted (e.g. `'GET /pipelines
   -> 503'`), AND `overall` SHALL be `'degraded'` (unless token also
   fails; the `unreachable` rule wins).
4. The four Pipedrive HTTP calls SHALL be issued in parallel
   (`Promise.all`) — health is read-only, the calls are independent, and
   sequential execution would multiply the wall-clock of the slowest
   check by four.

---

### P2: Web health pill

**User Story**: As an operator reviewing the settings/connectors list, I
want a colored "Ready / Degraded / Unreachable" pill on each row so that
I see status at a glance before drilling in.

**Acceptance Criteria**:

1. WHEN the connectors list renders THEN each row SHALL fetch its
   `health` via a `useConnectorHealth(workspaceId, accountId)` hook
   (TanStack Query, no auto-refetch — operator triggers a manual refresh
   button when wanted).
2. WHEN the health query is loading THEN the row SHALL show a neutral
   "Checking…" pill (Phosphor `Spinner`).
3. WHEN the health query resolves THEN the row SHALL show a colored pill:
   - `ready` → green (`bg-green-50 text-green-700`).
   - `degraded` → amber (`bg-amber-50 text-amber-700`).
   - `unreachable` → red (`bg-red-50 text-red-700`).
4. WHEN the operator hovers the pill THEN a tooltip SHALL list every
   failing check (`label` + `detail`). When all checks are `ok` the tooltip
   SHALL show "All checks passed".
5. WHEN the operator clicks a small refresh button next to the pill THEN
   the hook SHALL re-fetch the health endpoint.

**Independent Test**: Web spec renders the page with a mocked
`useConnectorHealth` returning each of `ready`/`degraded`/`unreachable`,
asserts the pill color and tooltip text.

---

## Edge Cases

- WHEN `Promise.all` on the four Pipedrive calls is settled, AND one of
  them throws (network exception, not just non-2xx) THEN the
  implementation SHALL catch per-call and convert the exception into a
  `fail` check with detail `'Pipedrive call threw: <message>'` — never
  propagate to the controller as 500.
- WHEN the stored `credentials.webhookToken` is a pre-053 row (legacy
  plaintext with no token) THEN the `webhook` check SHALL be `fail` with
  detail `'No webhook token on this connector account (created before
  feature 053).'` — explicit guidance, not just "missing".
- WHEN the operator hits the endpoint for a non-Pipedrive connector THEN
  the registry-level "connector does not implement checkHealth" rule fires
  (P1#6).

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PCH-01 | P1 API | Design | Pending |
| PCH-02 | P1 API | Design | Pending |
| PCH-03 | P1 API | Design | Pending |
| PCH-04 | P1 API | Design | Pending |
| PCH-05 | P1 API | Design | Pending |
| PCH-06 | P1 API | Design | Pending |
| PCH-07 | P1 API | Design | Pending |
| PCH-08 | P1 Pipedrive | Design | Pending |
| PCH-09 | P1 Pipedrive | Design | Pending |
| PCH-10 | P1 Pipedrive | Design | Pending |
| PCH-11 | P1 Pipedrive parallel calls | Design | Pending |
| PCH-12 | P2 Web pill | Design | Pending |
| PCH-13 | P2 Web pill | Design | Pending |
| PCH-14 | P2 Web pill | Design | Pending |
| PCH-15 | P2 Web tooltip | Design | Pending |
| PCH-16 | P2 Web refresh | Design | Pending |

**Coverage:** 16 total.

---

## Success Criteria

- [ ] Operator can determine "Pipedrive is ready for this pilot" in
      < 5 seconds (one click + ≤2-second response).
- [ ] All four Pipedrive calls run in parallel; total response time is
      dominated by the slowest call, not their sum.
- [ ] `bun check` green.
