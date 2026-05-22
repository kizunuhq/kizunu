# Meta/WhatsApp Plugin Design

Implements `spec.md`. The plugin is a plain class implementing the frozen
`ChannelPlugin` port; no NestJS DI inside it, so it slots into the `CHANNEL_PLUGINS`
provider array as an instance.

## Layout

```
apps/api/src/modules/channel/plugins/meta-whatsapp/
├── meta-whatsapp.plugin.ts          # implements ChannelPlugin
├── meta-credentials.ts              # zod configSchema + inferred type
├── meta-inbound.ts                  # parseInbound payload mapping (pure)
├── meta-send.ts                     # send body shaping + Graph API call
├── customer-service-window.ts       # isWithinServiceWindow(now, lastInboundAt)
└── __test__/unit/*.spec.ts
```

The plugin file wires these focused helpers so each function stays under 30 lines.

## Credentials (`meta-credentials.ts`)

```ts
export const metaCredentialsSchema = z
  .object({
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
  })
  .strict()
export type MetaCredentials = z.infer<typeof metaCredentialsSchema>
```

Camel-case keys (code standards); they map to Meta's `waba_id` / `phone_number_id`.
`.strict()` rejects unknown keys. This is the manifest `configSchema`, so
`create-channel-account` validates Meta credentials through the registry.

## validate (`customer-service-window.ts` + plugin)

`CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000` (named, no magic number).

```
isWithinServiceWindow(now, lastInboundAt):
  return lastInboundAt !== undefined && now - lastInboundAt <= WINDOW   // boundary inclusive

validate({ now, lastInboundAt, hasApprovedTemplate }):
  if isWithinServiceWindow(now, lastInboundAt) -> { action: 'send', mode: 'freeform' }
  if hasApprovedTemplate                       -> { action: 'send', mode: 'template' }
  return { action: 'error', reason: 'template_required' }
```

Pure and synchronous — the most-tested unit (the rule the port exists to hide).

## parseInbound (`meta-inbound.ts`)

Walks the Meta webhook shape defensively (every level optional), collecting text
messages into `InboundMessage`:

```
entry[].changes[].value:
  metadata.phone_number_id -> toExternalId
  messages[]:
    id        -> externalMessageId
    from      -> fromExternalId
    text.body -> body
    timestamp -> ts (seconds string -> Date)
```

Returns `[]` for status-only or malformed payloads; never throws (a webhook must
always 200). Implemented over a permissive `unknown` walk with small type guards,
not a strict zod parse, because Meta payloads vary and we only need the message
subset.

## send (`meta-send.ts`)

```
send(payload, credentials):
  creds = metaCredentialsSchema.parse(credentials)
  body  = payload.mode === 'template' ? templateBody(payload) : textBody(payload)
  res   = await fetchFn(`${baseUrl}/${creds.phoneNumberId}/messages`,
            { method POST, Authorization: Bearer creds.systemToken, json body })
  if !res.ok -> { status: 'failed', error }
  -> { externalMessageId: json.messages[0].id, status: 'sent' }
```

`baseUrl` defaults to `META_GRAPH_API_BASE` (`https://graph.facebook.com/v21.0`) and
`fetchFn` defaults to global `fetch`; both are constructor-injectable so unit tests
pass a fake fetch and assert request shape without network.

## Registration

`channel.module.ts`: replace `{ provide: CHANNEL_PLUGINS, useValue: [] }` with
`useValue: [new MetaWhatsappPlugin()]`. The registry now resolves `meta-whatsapp`;
`list-available-plugins` returns it; `create-channel-account` validates Meta creds.

## Test strategy (via generate-tests)

- **Fat (unit):** `validate` (four window cases incl. exact-24h boundary),
  `parseInbound` (text payload, status-only, multi-entry, junk), `send` (text vs
  template request shape + ok/non-ok mapping with a fake fetch). `metaCredentialsSchema`
  accept/reject is covered through the registry path (feature 002) but a direct
  accept/reject pair is cheap and worthwhile.
- **Thin:** the plugin class itself is a façade over the helpers — no separate test;
  exercised through the helper specs and the registry.
</content>
