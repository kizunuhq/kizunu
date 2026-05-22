# Engine Inbound Reply Design

Extends `apps/api/src/modules/engine/`.

```
engine/
├── core/use-cases/mark-reply.use-case.ts (+ __test__)
└── http/controllers/meta-webhook.controller.ts   # @Public, app-level
```

## Config

`api.config.ts`: add `meta: { verifyToken: APP_META_VERIFY_TOKEN }` (string, default '').

## Meta webhook controller (`@Public`)

- `GET /webhooks/meta`: read `hub.mode` / `hub.verify_token` / `hub.challenge` query;
  if `hub.verify_token === config.meta.verifyToken` (and mode `subscribe`) → return the
  challenge as `text/plain` 200; else `ForbiddenException`.
- `POST /webhooks/meta`: `metaPlugin.parseInbound(rawBody, {})` → `InboundMessage[]`.
  For each: `channelAccounts.findByPluginAndCredential('meta-whatsapp', 'phoneNumberId',
  msg.toExternalId)`; if found, `markReply.execute({ workspaceId, fromExternalId })`.
  Always `{ received: n }` 200.

The Meta plugin instance is resolved from `ChannelPluginRegistry.get('meta-whatsapp')`.
`phone_number_id` routing (Meta-specific) lives in this controller, not the engine core.

## MarkReplyUseCase

`execute({ workspaceId, phone })`:
- `journeys.findRunningByLeadPhone(workspaceId, phone)` → journey id or none → return.
- `db.transaction(tx => …)`: `journeys.lockById(tx, id)`; if status not in
  {running, paused, paused_owner_inactive} → return (already terminal / race lost);
  `setStatus(tx, id, transition(status, JourneyEvent.Reply))` → `replied`;
  then run `cadence.onReply` via `CadenceActionExecutor` (load cadence hooks +
  connector credentials, same as the dispatcher's `runActions`).

Reuses `lockById`/`setStatus` (feature 009) and `CadenceActionExecutor`. A small shared
`runActions` could be extracted, but the dispatcher's is private; this use-case has its
own minimal action run (load connector account → executor) to avoid coupling.

## Repository seams

- `LeadJourneyRepository.findRunningByLeadPhone(workspaceId, phone)` → `{ id }` (join
  lead; status running). Engine-internal.
- `ChannelAccountRepository.findByPluginAndCredential(pluginId, key, value)` →
  `{ id, workspaceId }` (`where pluginId = $1 and credentials->>$key = $value`).
- `lockById` already returns `cadenceId` + connector fields needed for `onReply`.

`Routes`: `webhooks.meta = '/webhooks/meta'`.

## Test strategy (generate-tests)

- **Integration:** `MarkReplyUseCase` against `kizunu_test` with a fake CRM connector
  registered — a running journey → `replied` + `onReply` (move_stage) executed; a
  terminal journey → unchanged; no-match phone → no-op.
- **Thin:** the webhook controller (verify echo + parse/route/delegate). The verify-token
  comparison is a small unit; routing is covered by the use-case.
- **Unit:** webhook verify (token match → challenge, mismatch → 403) if extracted to a
  pure helper.
</content>
