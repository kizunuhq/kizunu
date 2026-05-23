# WhatsApp Coexistence — research bundle

Pre-spec source-of-truth for the Phase 1.8 work
(see [`.specs/project/ROADMAP.md`](../../project/ROADMAP.md)). Read
[`context.md`](./context.md) first — it has the full bundle of URLs, verified
payload shapes, customer constraints, and implementation notes.

## Why this directory exists

The features in `.specs/features/` follow the `tlc-spec-driven` lifecycle
(spec → design → tasks → execute). Phase 1.8 is unusual: the work depends on
external behavior (Meta's WhatsApp Business Platform) that's poorly documented
in pages we can fetch in-context, and on the conventions of one good OSS
reference (Chatwoot) that has shipped a partial implementation. Capturing all of
that *once* — with permalinks pinned to immutable commits — keeps the eventual
029 / 030 / 031 specs concise and lets them cite a stable, diff-able artifact.

`.specs/research/` is a new sibling to `.specs/codebase/` and `.specs/features/`.
It holds long-lived investigation notes for cross-feature topics. Other entries
should follow the same shape: a kebab-case slug directory, one `README.md`, one
`context.md`, and a `snippets/` folder for verbatim external material.

## Contents

- [`context.md`](./context.md) — the bundle. Meta docs, OSS implementations,
  verified facts (FB.login config, payload shapes, Graph API surface), customer
  + Meta constraints, gaps, implementation notes for the eventual specs.
- [`snippets/`](./snippets/) — verbatim source material pinned to specific
  commit SHAs. See [`snippets/README.md`](./snippets/README.md) for the
  inventory.

## Maintenance

Refresh `context.md` and the `snippets/` SHAs before each Phase 1.8 feature
starts. Meta's WhatsApp APIs shift; OSS reference projects evolve. A stale
research doc is worse than no research doc — it gives false confidence.
