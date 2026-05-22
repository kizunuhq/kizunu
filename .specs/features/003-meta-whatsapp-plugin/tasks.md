# Meta/WhatsApp Plugin Tasks

## T1 — Credentials schema + service window — META-01, META-02

- `meta-credentials.ts` (strict zod schema + type); `customer-service-window.ts`
  (`CUSTOMER_SERVICE_WINDOW_MS`, `isWithinServiceWindow`).
- Gate: `bun typecheck` + `check-zod-v4.ts`.

## T2 — parseInbound + send helpers — META-03, META-04

- `meta-inbound.ts` (defensive payload walk → `InboundMessage[]`, never throws);
  `meta-send.ts` (`textBody`/`templateBody` + Graph API call with injected `fetchFn`/`baseUrl`).
- Gate: `bun typecheck`.

## T3 — Plugin class + registration — META-01..04

- `meta-whatsapp.plugin.ts` implementing `ChannelPlugin` (manifest + delegates to helpers);
  wire `new MetaWhatsappPlugin()` into `CHANNEL_PLUGINS` in `channel.module.ts`.
- Done when: registry resolves `meta-whatsapp`; app boots; create accepts Meta creds.
- Gate: `bun check`.

## T4 — Tests (generate-tests) — META-01..04

- Unit: `validate` (4 window cases incl. exact 24h), `parseInbound` (text/status-only/multi/junk),
  `send` (text vs template shape + ok/non-ok) with fake fetch, credentials accept/reject.
- Gate: `bun check` + CI-strict lint.

## T5 — Docs + state

- ROADMAP (channel line: Meta plugin landed, webhook remains with engine), STATE, STRUCTURE,
  INTEGRATIONS (Meta Graph API now integrated outbound).
- Gate: `bun check`.
</content>
