# WhatsApp CoEx setup readiness (channel health) — Tasks

Sequential. `bun check` green after each.

## T1 — Promote `ConnectorHealth` → shared `ResourceHealth` rename **OR** reuse as-is

Decision: **reuse as-is**, with a re-export from a neutral path. The
type already lives in `@kizunu/api-contracts/crm`; adding a deprecated
alias risks breaking imports. We re-export the same types from a new
`@kizunu/api-contracts/shared/resource-health.ts` and direct new
callers there. **Minimal change** — leave the crm-namespaced exports
in place.

Actually simpler: keep the type in `@kizunu/api-contracts/crm` and
re-export from `@kizunu/api-contracts/channel`. Both the CRM and
channel surfaces consume it; the name is fine.

**Done when:** `@kizunu/api-contracts/channel` re-exports
`ConnectorHealth`, `ConnectorHealthCheck`, and the const objects so
channel-side use cases don't import from `crm`.

## T2 — `ChannelPlugin.checkHealth?` + registry + exception

- Add `checkHealth?(input: { credentials: z.infer<S> }): Promise<ConnectorHealth>` to `ChannelPlugin`.
- Add `ChannelPluginRegistry.checkHealth(id, raw)` mirroring the CRM seam.
- New `ChannelHealthUnsupportedException` (`channel.health-unsupported`, 422).
- Existing `ChannelAccountNotFoundException` already covers the 404 case.

## T3 — Meta plugin: `runMetaHealth` helper

`apps/api/src/modules/channel/plugins/meta-whatsapp/meta-health.ts`
runs `/me` + `/{phoneNumberId}` in parallel, evaluates
`verifyToken` synchronously, and conditionally evaluates `expiry`
for Coex credentials. Returns `ConnectorHealth`.

Coex path is the only one with an expiry check (`channelMode === 'coexistence'`).
Cloud API short-circuits to skip the expiry check.

## T4 — Wire Meta + Coex plugins

Both `buildMetaWhatsappPlugin` (Cloud API) and `buildMetaWhatsappCoexPlugin`
(Coex) declare `checkHealth` and delegate to `runMetaHealth`.

## T5 — Use case + controller

- `CheckChannelHealthUseCase` (thin).
- `ChannelAccountController` adds `GET .../health`.
- Wire in `ChannelModule`.

## T6 — E2E

`channel-health-flow.spec.ts` covers happy / token-rejected / unsupported.

## T7 — Web — generic `ResourceHealthPill` + channel hook

The connector pill is moved to `connector-health-pill.tsx → resource-health-pill.tsx`
(or wrapper rename), and the connectors page imports the same primitive.
A new `useChannelHealth` hook ships in `@kizunu/api-client/channel/`.

## T8 — Web — channels page row integration

The settings/channels page's channel-accounts table gains a "Status"
column with the pill.

## T9 — Docs

ROADMAP entry → COMPLETE. STATE.md Lessons entry.
