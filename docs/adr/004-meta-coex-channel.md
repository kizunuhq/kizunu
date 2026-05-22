# ADR-004: Meta Cloud API (Coexistence) as the v0.1 WhatsApp Channel

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: channel, whatsapp, plugin, v0.1

## Context and Problem Statement

The first real pilot is a BDR team running a WhatsApp follow-up cadence off Pipedrive. The original v0.1 plan ([../v0.1-scope.md](../v0.1-scope.md)) used the Evolution API as the first channel plugin. Onboarding this client forces the call: ship on an unofficial provider with ban risk, or on the official Meta Cloud API. A number dropping mid-pilot would kill both the engagement and the reference customer.

## Decision Drivers

- No ban risk — the pilot number must stay live for the whole engagement.
- The customer requested Meta Coexistence explicitly (number stays usable on the BDR's phone).
- Whatever we pick must not contaminate the channel-agnostic domain; a second channel must stay cheap to add.

## Considered Options

- **A** — Meta Cloud API, onboarded via Coexistence (Embedded Signup).
- **B** — Evolution API (unofficial), one instance per BDR (the original plan).

## Decision Outcome

Chosen option: **A**. The pilot ships on the official Meta Cloud API via Coexistence, so the number stays live on the BDR's phone. Evolution is dropped from v0.1 and demoted to "a plugin a workspace may choose later."

Meta concepts (`waba_id`, `phone_number_id`, template names, the 24h customer-service window) stay inside the plugin. The engine sees only `Decision { action, mode?, reason? }`. `validate` decides freeform vs. template at runtime; outbound past the 24h window must use a pre-approved Message Template (HSM). This protects the channel-agnostic thesis the vision depends on.

### Positive Consequences

- No ban risk; official API stability for the reference customer.
- Number stays usable on the BDR's phone (Coexistence).
- Provider peculiarities stay isolated in the plugin; the domain is unaware of Meta.

### Negative Consequences

- Message Templates (HSM) become a hard prerequisite, not optional: cold follow-ups land outside the 24h window and must use pre-approved templates.
- Heavier onboarding (Embedded Signup / Coexistence) plus an operational rule — open the WhatsApp Business app at least every 14 days to keep CoEx alive.
- Per-conversation Meta pricing.

## Pros and Cons of the Options

### A — Meta Cloud API via Coexistence ✅ Chosen
- ✅ Official, no ban risk; number stays on the phone
- ✅ Customer-requested
- ❌ HSM templates mandatory; heavier onboarding; per-conversation pricing

### B — Evolution API
- ✅ Lighter onboarding, no template gate, no per-conversation cost
- ❌ Unofficial — ban risk that would kill the pilot

## Links

- Context: [../v0.1-scope.md](../v0.1-scope.md)
- Related: [005-db-poller-scheduler.md](005-db-poller-scheduler.md)
