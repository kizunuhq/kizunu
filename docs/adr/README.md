# Architecture Decision Records

Decisions are immutable historical records. Never edit a decision after the fact — supersede it with a new ADR and link back.

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-domain-owns-vocabulary.md) | Domain Owns the Vocabulary; Dependencies Point Inward | Accepted |
| [002](002-enum-as-const-object.md) | Enum-like Types as a Derived `const` Object | Accepted |
| [003](003-schema-domain-guard.md) | Compile-Time Layer-Boundary Guard for Schema↔Domain Conformance | Accepted |
| [004](004-meta-coex-channel.md) | Meta Cloud API (Coexistence) as the v0.1 WhatsApp Channel | Accepted |
| [005](005-db-poller-scheduler.md) | In-Process DB Poller as the Scheduler, Not BullMQ/Redis | Accepted |
| [006](006-auth-posture.md) | v0.1 Auth Posture — Email/Password, sameSite + CORS for CSRF, IP Rate-Limit | Accepted |
