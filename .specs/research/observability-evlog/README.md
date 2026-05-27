# Research: observability via `evlog` (feature 086)

Cross-feature research bundle for the Phase 2.2 observability spike.
Following the pattern set by [`whatsapp-coexistence`](../whatsapp-coexistence/),
this directory captures the external contracts the implementation depends on
**before** `tlc-spec-driven` runs, so the spec is planned against the real
library surface, not training-data intuition.

## Why research-first

`evlog` is a young library (v2.18.1 at time of research, May 2026) with no
StackOverflow trail; the only authoritative source is the GitHub monorepo. The
spike introduces a brand-new dependency, a new HTTP middleware, a new exception
shape, and a new project-wide convention (wide-events). Each of those is the
kind of "poorly documented external system" the memory-tagged research-first
pattern names.

## What's here

| File | Purpose |
| --- | --- |
| `README.md` (this file) | Orientation + index. |
| `context.md` | Distilled facts: API surface, default behavior, NestJS wiring, error envelope, version pin. Read this first. |
| `snippets/evlog-nestjs-example/` | Verbatim copy of the upstream `examples/nestjs/` (main.ts, app.module.ts, app.controller.ts, README.md, package.json). |
| `snippets/evlog-package-src/` | Verbatim copy of the parts of `packages/evlog/src/` that matter for the spike: `nestjs/index.ts` (the actual module + middleware), `index.ts` (full re-export surface), `logger.ts`, `error.ts`, `types.ts`, `pipeline.ts`, `adapters/{fs,memory,otlp,_drain,_config}.ts`. |

## Commit pin

All snippets are pulled from upstream commit
[`07cf733d21a17542158980ce9988de991d0e6011`](https://github.com/HugoRCD/evlog/commit/07cf733d21a17542158980ce9988de991d0e6011)
(main, 2026-05-25). If we re-research later, refresh the pin and diff the
relevant files.

## Out of scope of the research

- The OTLP drain into self-hosted Monoscope. Recorded as a later step in
  `ROADMAP.md → Later`, gated on Phase 1.7 deploy (`028`) and an S3 bucket
  decision. We only need to confirm the drain *exists* and is OTLP-compliant
  (`adapters/otlp.ts`, present), not its operational details.
- Sampling / redaction beyond what fits in `context.md`'s "Notable defaults"
  section. The spike runs at 100% sampling on one route — sampling rules ship
  with the broader sweep (Next, post-086).
