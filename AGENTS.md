## Project overview

- Kizunu is an open-source sales engagement engine: multi-channel outbound cadences with reply-stop and pluggable providers.
- Bun-based monorepo with apps under `apps/` (currently `apps/api`, `apps/web`) and shared code under `packages/`.
- Long-form product and architecture docs live under `docs/` (vision, v0.1 scope).

## Setup and validation

- Always use Bun for repo scripts and package management.
- Required: Bun `1.3.13+`, Node.js `22+`.
- Install with `bun install`.
- Dev: `bun dev` (runs all apps in parallel).
- Build: `bun build`.
- Typecheck: `bun typecheck`.
- Lint: `bun lint`.
- Format: `bun format`.
- Auto-fix: `bun fix`.
- Full local check pipeline: `bun check`.

## Workflow rules

- Never change `AGENTS.md` unless the user explicitly asks.
- Do not prefix unused variables with an underscore; delete them.
- Do not use emojis in commit messages, logs, or documentation.
- Run the relevant checks after making changes — do not stop at code edits.

## Branches and commits

- Default branch is `master`. Branch from `master` when a branch is needed.
- Keep branch names short and descriptive (e.g., `docs/v0.1-scope`, `feat/cadence-engine`).
- Use Conventional Commits (enforced by commitlint).
- Keep commits focused: one logical change per commit.
- Commit subjects are short and describe the outcome.
- Add a short body when extra context helps; explain what changed and why, not how.
- Wrap body lines before the commitlint line-length limit.
- Never leave commitlint warnings unresolved.

## Code style

- Follow existing code style; keep changes aligned with nearby code.
- Use kebab-case for file and folder names by default.
- Avoid vague filenames like `helpers.ts`, `misc.ts`, or `utils.ts` when a better name exists.
- Avoid unnecessary comments; prefer self-explanatory code and naming.
- Interactive UI elements must remain accessible (keyboard, focus, accessible names for icon-only controls).

## Code organization

- Group feature-specific code under `apps/[app]/src/features/[feature]/` when applicable.
- Keep shared primitives in `src/components`, shared hooks in `src/hooks`, generic helpers in `src/utils`.
- Do not promote feature-specific code into shared folders just because it is convenient.
- Use subfolders (`components`, `hooks`, `services`, `stores`, `types`, `tests`) inside each feature folder.
- Cross-app shared code lives in `packages/`, not inside an app.

## Documentation

- Product and architecture decisions live in `docs/`.
- Update `docs/v0.1-scope.md` when v0.1 scope changes — do not silently drift.
- Update `docs/vision.md` when long-term positioning or roadmap shifts.
