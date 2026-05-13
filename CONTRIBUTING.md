# Contributing to Kizunu

Thanks for your interest in contributing. Please check existing issues and pull requests before opening new ones.

## Setup

Prerequisites:

- [Bun](https://bun.sh) `1.3.13+`
- [Node.js](https://nodejs.org) `22+`

```bash
bun install
bun dev
```

## Before submitting a PR

1. Code passes checks: `bun check`
2. Auto-fix what you can: `bun fix`
3. Format when needed: `bun format`
4. Rebase on master: `git rebase origin/master`
5. Squash commits into logical units

## Guidelines

- Follow the existing code style.
- Use Conventional Commits — commit subjects describe the outcome (e.g., `feat: add cadence scheduler`, `fix: avoid duplicate touch dispatch under race`).
- One logical change per commit.
- Update documentation under `docs/` when relevant.
- New behavior or bug fixes should ideally come with tests.

## Reporting

- Found a bug? Open a [bug report](https://github.com/kizunuhq/kizunu/issues/new?template=01-bug.yml).
- Have an idea? Open a [feature request](https://github.com/kizunuhq/kizunu/issues/new?template=02-feature.yml).
- Security: see [SECURITY.md](SECURITY.md). Do not file security issues publicly.

## Project direction

- [Vision and positioning](docs/vision.md) — long-term thesis and roadmap.
- [v0.1 scope](docs/v0.1-scope.md) — what's in and out of the first version.

Contributions outside the current scope are welcome as discussions or feature requests, but expect them to be deferred until the v0.1 pilot stabilizes.
