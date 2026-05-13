# Vision and positioning

## Thesis

The sales engagement market has two poorly connected extremes:

- **CRMs of record** (Pipedrive, Twenty, HubSpot): great at storing deals, weak at executing multi-channel cadence — especially WhatsApp-first.
- **Sales engagement tools** (Outreach, Salesloft, Reply, Meetime): expensive, US-centric, email/phone-first, treat WhatsApp as a second-class citizen.

In Brazil, LatAm, India, and Southeast Asia, sales happen on WhatsApp. Neither category was designed for that. Today's default solution is a workaround: CRM + n8n + WhatsApp API + spreadsheet. It works, but it's fragile and requires an on-call automation engineer.

**Kizunu is what's missing:** an open-source, _channel-agnostic_ sales engagement platform with channels pluggable via OpenAPI. WhatsApp is the first channel, but the engine is not WhatsApp-specific — Telegram, email, SMS, voice, LinkedIn, RCS are all plugins.

## What makes Kizunu different

1. **Channels as plugins** — Meta Cloud API, Z-API, Evolution, WPPConnect, Twilio, SendGrid — the customer picks (or implements) the provider.
2. **Cadence as code** — declarative sequence of touches with automatic reply-stop, multi-channel.
3. **API-first** — REST + OpenAPI from day one. The UI is a client of the same API.
4. **Open core** — engine + common connectors under permissive license; paid cloud and commercial enterprise features.
5. **Optional CRM** — Kizunu has a simple native CRM, but integrates with Pipedrive/HubSpot/Salesforce via connectors.

## Mental comparables

- **Novu for outbound sales** (notification plugin system → engagement plugin system)
- **Vertical n8n** (workflow engine focused on sales cadence)
- **Open-source Twilio Engage** (multi-channel orchestration, but OSS)
- **Twenty + cadence** (Twenty is a beautiful CRM; Kizunu adds the execution engine it lacks)

## Vision roadmap (long-horizon, not MVP)

| Phase | Focus                   | Solves                                                     |
| ----- | ----------------------- | ---------------------------------------------------------- |
| 1     | Engagement engine       | Multi-channel cadence with reply-stop                      |
| 2     | Native CRM + connectors | Pipeline, deals, contacts; connectors to Pipedrive/HubSpot |
| 3     | Top of funnel           | Forms, landing pages, enrichment, scoring                  |
| 4     | Intelligence (AI)       | Reply classification, touch generation, BDR coaching       |

Each phase opens a larger TAM. Do not try to do everything in v0.1.

### v0.1 within the roadmap

The v0.1 scope is the **minimum slice of Phase 1** that runs a real pilot end-to-end. Detailed in [v0.1-scope.md](v0.1-scope.md).

Summary:

- 1 channel plugin (Evolution / WhatsApp), with the model prepared for N
- 1 CRM connector (Pipedrive), with the model prepared for N
- Cadence as the central aggregate — no generic workflow builder
- Per-BDR channel instances (each BDR with their own WhatsApp number)
- No native CRM, no AI, no conditional branching, no multi-tenant cloud

Assumed pre-condition: a real pilot validates the thesis of "cadence + reply-stop + Pipedrive + per-BDR WhatsApp".

### Phase 1.5 — where differentiation appears

v0.1 alone is not differentiated. **"WhatsApp automation for Pipedrive with reply-stop" already exists** in several closed SaaS products (Kommo, Leadsales, partial Sleekflow). Kizunu's defensibility — real plugin system, channel-agnostic, OSS — is only proven once the following ship:

- A second channel (email SMTP or Telegram) — proves channel plugin isn't WhatsApp in disguise
- A second CRM connector (HubSpot or RD Station) — proves CRM-agnostic isn't Pipedrive in disguise
- A first community-contributed plugin — proves open core generates a community

This Phase 1.5 should ship **shortly after** v0.1 stabilizes with a real pilot. Delaying too long means becoming a commodity. Pulling it into v0.1 means never finishing v0.1.

## Market positioning

**Category:** Sales engagement platform (open source, channel-agnostic).

**Direct competition:**

- **Outreach / Salesloft / Reply** — enterprise, US-centric, no decent WhatsApp, closed.
- **Kommo / Leadsales / Sleekflow** — BR/LatAm WhatsApp-first, closed, no real plugin system.
- **Twenty** — beautiful OSS CRM, but doesn't do multi-channel cadence.

**Defensible advantages:**

1. Channel plugin system — others have fixed channels.
2. Open source — dev-community adoption (Twenty, Cal, Novu, n8n prove the model).
3. WhatsApp-first without betraying Western channels — the only product that serves LatAm and US/EU equally well.

## Commercial strategy: open core

**Open source core** (AGPLv3):

- Cadence engine
- Plugin SDK + common connectors (WhatsApp Evolution, Email SMTP, etc.)
- REST + OpenAPI
- Basic UI
- Self-host (Docker Compose)

**Paid cloud (kizunu.com):**

- Managed hosting
- Embedded AI (reply classification, touch generation)
- Multi-tenant
- SSO, audit log, advanced RBAC
- Premium connectors (Salesforce, HubSpot Enterprise)
- SLA support

**License adopted:** AGPLv3 for the core + separate commercial cloud. Protects against cloud copy (AWS-style) and sustains the open core model. Accepted risk: some enterprises avoid AGPL — reassess if it becomes a real adoption blocker.

## Target user

**v0.1 (early adopters):**

- Outbound operations at SMBs (10–50 employees, 1–5 BDRs)
- Technical teams familiar with n8n / self-host / APIs
- Currently use Pipedrive or a spreadsheet + manual WhatsApp + broken n8n

**v1.0 (broader market):**

- SMBs in any country with WhatsApp/SMS dominance (BR, MX, IN, ID, NG)
- RevOps teams at scale-ups looking for an OSS alternative to Outreach
- Agencies/consultancies running outbound for clients (multi-tenant)

**Deliberately not targeting:**

- Fortune 500 enterprises (don't buy small OSS early)
- Non-technical solo merchants (they go to plug-and-play Kommo)

## How the product avoids common pitfalls

1. **WhatsApp compliance:** the plugin system isolates risk — if Evolution gets banned, swap to Meta Cloud without rewriting the cadence.
2. **Doesn't become "does everything, badly":** v0.1 is surgical (1 real channel, no full CRM). Expansion is driven by real customers.
3. **Doesn't compete with CRMs in v0.1:** integrates with existing Pipedrive. Native CRM only in phase 2.
4. **Sustainable OSS:** open core from day one, no "everything free forever" dilemma.

## Success metrics (long-term, not MVP)

- **6 months:** 3–5 pilot customers on self-host, feedback validating the plugin system thesis.
- **12 months:** 100+ GitHub stars, first community-contributed connectors, cloud beta with 10+ paying users.
- **24 months:** $10k+ cloud MRR, active dev community, 3+ mature first-party channels.
