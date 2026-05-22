# Meta/WhatsApp Channel Plugin Specification

## Problem Statement

Feature `002` froze the `ChannelPlugin` port and proved it with a fake plugin. v0.1
needs the real **Meta Cloud API / WhatsApp** plugin (decision D6, via Coexistence):
the `validate` hook that decides freeform vs. HSM template against the 24h
customer-service window, `parseInbound` for Meta webhook payloads, `send` against the
Graph API, and a credential `configSchema` (`wabaId`, `phoneNumberId`, system token).
Registering it makes `meta-whatsapp` channel accounts real (credentials validated on
create) and gives the engine a concrete channel to dispatch through.

## Goals

- [ ] Implement `ChannelPlugin` for Meta with id `meta-whatsapp`, capabilities
      `['freeform', 'template']`, and a credential `configSchema`.
- [ ] `validate` encodes the 24h window rule: inside the window freeform is allowed;
      outside, an approved template is required or the decision is `error`
      (`template_required`) — never freeform outside the window (decision D1/D2).
- [ ] `parseInbound` maps a Meta webhook payload to `InboundMessage[]`, routing key
      = `phone_number_id`.
- [ ] `send` posts text or template messages to the Graph API and maps the result to
      `SendResult`.
- [ ] Register the plugin into `CHANNEL_PLUGINS` so the registry resolves it and
      channel-account creation validates Meta credentials.

## Out of Scope

| Feature | Reason |
| --- | --- |
| App-level inbound webhook (GET verify + POST route) | Routes inbound to `LeadJourney`; ships with the Engine slice where that consumer exists |
| Embedded Signup / Coexistence onboarding UI | Onboarding is operational/UI; this slice consumes already-issued credentials |
| Template catalog sync from Meta | Templates are modeled in the Cadence/Template feature; `validate` only takes `hasApprovedTemplate` |
| Retry/backoff + outbound queue | Engine concern (throttled queue lives with dispatch) |
| Media messages | `media` capability deferred; v0.1 sends text + template |

---

## User Stories

### P1: Meta credential schema + registration ⭐ MVP

**User Story**: As an admin, I create a `meta-whatsapp` channel account and have its
`wabaId` / `phoneNumberId` / system token validated before it is stored.

**Why P1**: Without registration the registry rejects every Meta account.

**Acceptance Criteria**:

1. WHEN the plugin is registered THEN the registry SHALL resolve `meta-whatsapp` and
   `list-available-plugins` SHALL include it with capabilities `['freeform','template']`.
2. WHEN a Meta account is created with valid credentials THEN it SHALL persist; WHEN a
   required credential field is missing THEN create SHALL reject (422).

**Independent Test**: Register plugin, assert resolve + manifest; assert configSchema
accepts a full credential set and rejects a missing field.

---

### P1: 24h-window validate decision ⭐ MVP

**User Story**: As the engine, I ask the plugin whether the next touch may send and how
(freeform vs template), so I never send freeform outside Meta's 24h window.

**Why P1**: This is the core Meta peculiarity the port exists to hide (D1/D2).

**Acceptance Criteria**:

1. WHEN the last inbound from the lead is within 24h of `now` THEN `validate` SHALL
   return `{ action: 'send', mode: 'freeform' }`.
2. WHEN the window is closed (no inbound, or inbound older than 24h) and an approved
   template applies THEN `validate` SHALL return `{ action: 'send', mode: 'template' }`.
3. WHEN the window is closed and no approved template applies THEN `validate` SHALL
   return `{ action: 'error', reason: 'template_required' }`.
4. WHEN `now - lastInboundAt` is exactly 24h THEN the window SHALL still be considered
   open (boundary inclusive).

**Independent Test**: Drive `validate` across the four cases above with fixed dates.

---

### P1: Parse inbound Meta payloads ⭐ MVP

**User Story**: As the (future) inbound webhook, I hand the plugin a raw Meta payload and
get normalized `InboundMessage[]`.

**Acceptance Criteria**:

1. WHEN a payload contains text messages THEN `parseInbound` SHALL return one
   `InboundMessage` each with `fromExternalId`, `toExternalId` (= `phone_number_id`),
   `body`, `ts`, and `externalMessageId`.
2. WHEN a payload carries only status updates (no `messages`) THEN `parseInbound` SHALL
   return `[]`.
3. WHEN a payload is malformed/unrecognized THEN `parseInbound` SHALL return `[]`
   (never throw on a webhook body).

**Independent Test**: Parse a sample inbound-message payload, a status-only payload, and
a junk payload.

---

### P2: Send text and template messages

**User Story**: As the engine, I call `send` with a resolved payload and the plugin posts
to the Graph API.

**Acceptance Criteria**:

1. WHEN `send` is called with `mode: 'freeform'` THEN it SHALL POST a `text` message to
   `{base}/{phoneNumberId}/messages` with the system token as bearer.
2. WHEN `send` is called with `mode: 'template'` THEN it SHALL POST a `template` message
   with the template name, language, and variables.
3. WHEN the Graph API responds OK THEN `send` SHALL return
   `{ externalMessageId, status: 'sent' }`; WHEN it responds non-OK THEN
   `{ status: 'failed', error }`.

**Independent Test**: Call `send` with a fake fetch, assert request shape per mode and
result mapping for ok / non-ok.

---

## Edge Cases

- WHEN `validate` is asked with `mode: 'template'` but the manifest lacks the `template`
  capability THEN it SHALL not claim template (not applicable to Meta, which has it).
- WHEN a Meta payload nests multiple `entry`/`changes` THEN all messages across them are
  collected.
- WHEN `send` receives a non-JSON or error body THEN it SHALL map to `status: 'failed'`
  without throwing.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| META-01 | P1: schema + registration | Tasks | Pending |
| META-02 | P1: validate 24h window | Tasks | Pending |
| META-03 | P1: parseInbound | Tasks | Pending |
| META-04 | P2: send text/template | Tasks | Pending |

**Coverage:** 4 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] `validate` provably never returns freeform outside the 24h window.
- [ ] `parseInbound` never throws on arbitrary input.
- [ ] Creating a `meta-whatsapp` account validates real credentials.
</content>
