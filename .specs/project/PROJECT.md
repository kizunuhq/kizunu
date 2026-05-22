# Kizunu

**Vision:** An open-source, channel-agnostic sales engagement platform that runs multi-channel outbound cadences with automatic reply-stop and pluggable providers. WhatsApp is the first channel; the engine is not WhatsApp-specific.
**For:** Technical outbound / RevOps teams at SMBs (1–5 BDRs) in WhatsApp-first markets, currently gluing together CRM + n8n + WhatsApp API + spreadsheets.
**Solves:** The gap between CRMs of record (store deals, weak at WhatsApp-first cadence) and US-centric sales engagement tools (expensive, email/phone-first, treat WhatsApp as second-class).

## Goals

- **Run one real pilot end-to-end** (the v0.1 contract): BDR moves a Pipedrive deal into a follow-up stage → neutral WhatsApp cadence fires per-BDR → every touch logged as a Pipedrive Activity → any reply pauses the cadence and moves the deal to "Replied/Scheduling" → exhaustion marks the deal `lost` with reason "No Reply - Follow-up L1". If any part doesn't run, v0.1 isn't done.
- **Prove the model is genuinely pluggable** — channel (Meta/WhatsApp via Coexistence) and CRM (Pipedrive) enter as a plugin and a connector behind frozen contracts; Meta/Pipedrive specifics never leak into the domain (no `wabaId`/`templateName` on `Lead`/`Cadence`).
- **Keep the engagement domain decoupled from infrastructure** — home-grown minimal auth so `Workspace`/`Membership` stay domain entities; a future auth swap touches only the auth boundary.

## Tech Stack

**Core:**

- API framework: NestJS 11 (`apps/api`, `@nestjs/platform-express`)
- Web framework: React 19 + TanStack Router + TanStack Query, Vite (`apps/web`)
- Language: TypeScript 5.9
- Database: PostgreSQL via Drizzle ORM 0.45 (migrations via drizzle-kit)
- Runtime / tooling: Bun (monorepo workspaces), vite-plus test runner (Vitest)

**Key dependencies:** Zod v4 (validation, top-level formats), `@kizunu/api-contracts` + `@kizunu/nestjs-shared` shared packages, react-hook-form, Tailwind. REST + OpenAPI from day one (API-first; the UI is a client of the same API).

**License:** AGPLv3 core + separate commercial cloud (open-core model).

## Scope

**v0.1 includes:**

- Cadence as the central aggregate (entry trigger → ordered steps → stop policy → named exit hooks `onReply`/`onExhausted`/`onComplete`); closed action vocabulary, no workflow builder.
- One channel plugin: Meta Cloud API / WhatsApp via Coexistence — per-BDR numbers, 24h-window vs. HSM template decision inside the plugin's `validate`.
- One CRM connector: Pipedrive — normalized inbound events, throttled outbound (Activity, move stage, mark lost), per-workspace API token.
- In-process DB poller scheduler over `LeadJourney.nextTouchAt` (no Redis/BullMQ); pessimistic row lock resolves the dispatch/reply race.
- Home-grown minimal auth (email/password or magic link — pick one), session table.
- REST + OpenAPI CRUD for every domain entity; authenticated public webhook endpoints (CRM ingestion + channel inbound).
- Minimum UI: admin (users, workspace channels, Pipedrive mapping) and BDR (my channels, cadences/templates, inbox, journey list).

**Explicitly out of scope (phase 2+):**

- Workflow engine / generic triggers / visual builder; conditional branching inside a step.
- Multi-channel per step; automatic channel fallback; round-robin / load balancing.
- Native CRM (deals, own pipeline); forms / landing pages / scoring / enrichment.
- AI / reply classification / touch generation.
- Granular RBAC beyond membership role; SSO; audit log; multi-tenant cloud.
- Automatic lead reassignment when a user is deactivated (manual only in v0.1).

## Constraints

- **Technical:** Pre-approved Meta Message Templates (HSM) required before the pilot — cold follow-ups land outside the 24h window. CoEx link needs the WhatsApp Business app opened at least every 14 days. Pipedrive rate limit ~100 req / 10s (throttled outbound queue, exponential backoff, max 3 retries then `error_state`).
- **Architectural (settled):** Channel plugins load as monorepo modules (not separate processes); reassess isolation for third-party plugins. Reassess BullMQ when volume requires it. See `docs/adr/004` (Meta over Evolution) and `docs/adr/005` (poller over BullMQ).
- **Resources:** Single small team; v0.1 success is one validated pilot, not breadth. Differentiation (2nd channel, 2nd CRM, first community plugin) is Phase 1.5, shortly after v0.1 stabilizes.
