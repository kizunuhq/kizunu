# shadcn-First Frontend Primitives Specification

## Problem Statement

`apps/web` has shadcn configured (`components.json`, style `base-nova`, base lib
`@base-ui/react`, Phosphor icons) but zero primitives installed and no written rule
governing how UI primitives are sourced. As the v0.1 "Minimum UI" (auth, admin, BDR)
gets built, agents could hand-roll styled `div`s instead of composing shadcn
components, producing an inconsistent, unmaintainable UI. We need the convention
written and enforced, and a primitives baseline in place, before route work starts.

## Goals

- [ ] Codify a "shadcn-first" rule in `.agents/rules/react.md`: every primitive UI
      component in `apps/web` originates from shadcn/ui (via the shadcn skill),
      customized in-project; bespoke components only when no shadcn primitive fits.
- [ ] Reflect the convention in the relevant `.specs/codebase/` docs (CONVENTIONS,
      ARCHITECTURE, STRUCTURE) so the brownfield map stays accurate.
- [ ] Install a foundational primitives baseline into
      `apps/web/src/components/primitives/` (the `ui` alias) via the shadcn CLI.
- [ ] `bun check` stays green after the additions.

## Out of Scope

| Feature                                   | Reason                                              |
| ----------------------------------------- | --------------------------------------------------- |
| Refactoring placeholder routes to shadcn  | Separate feature; this pass establishes the foundation only |
| Building auth / admin / BDR UI            | Those are their own roadmap features                |
| Adding every shadcn component             | Install only the foundational set; add the rest on demand   |
| Changing the shadcn preset / theme        | `base-nova` already chosen; not revisiting          |
| Editing `AGENTS.md`                        | Forbidden unless the user explicitly asks           |

---

## User Stories

### P1: Shadcn-first rule is written and enforced as a convention ⭐ MVP

**User Story**: As an agent building `apps/web`, I want a written, discoverable rule
that primitives come from shadcn first, so the UI stays consistent and I know to
consult the shadcn skill before hand-rolling markup.

**Why P1**: Without the rule, the baseline is just unused files; the rule is what
changes behavior on every future UI task.

**Acceptance Criteria**:

1. WHEN an agent reads `.agents/rules/react.md` THEN it SHALL find a rule stating
   that `apps/web` primitives must originate from shadcn/ui (consulting the shadcn
   skill), be customized in-project, and that bespoke primitives are only created
   when no shadcn primitive fits, with Incorrect/Correct examples.
2. WHEN an agent reads `.specs/codebase/CONVENTIONS.md` THEN it SHALL find the
   shadcn-first convention listed alongside the existing conventions.
3. WHEN an agent inspects `apps/web/src/components/primitives/` THEN it SHALL find the
   installed shadcn primitives as the canonical source of UI building blocks.

**Independent Test**: Open `react.md` and `CONVENTIONS.md` and confirm the rule is
present with examples and a pointer to the shadcn skill.

---

### P1: Foundational primitives baseline is installed ⭐ MVP

**User Story**: As an agent building the first real screens (login, members), I want a
foundational set of shadcn primitives already installed, so I can compose UI without
bootstrapping the baseline first.

**Why P1**: The first roadmap UI (auth login form, members table) needs these
primitives; installing them now removes friction and proves the pipeline works.

**Acceptance Criteria**:

1. WHEN the shadcn CLI installs the baseline THEN the components SHALL land in
   `apps/web/src/components/primitives/` (the `ui` alias from `components.json`).
2. WHEN the baseline is installed THEN it SHALL include the foundational set needed
   for the first screens: button, input, label, field, card, separator, and sonner
   (toast), using the project's `@base-ui/react` base and Phosphor icons.
3. WHEN `bun check` runs after install THEN it SHALL pass (typecheck, lint under CI
   strictness, format, import-depth, zod-v4, drizzle checks).

**Independent Test**: `ls apps/web/src/components/primitives/` shows the baseline
files; `bun check` is green.

---

## Edge Cases

- WHEN an installed primitive imports from a hardcoded `@/components/ui/...` path
  THEN the import SHALL be rewritten to the project alias `@kizunu/web/...`.
- WHEN an installed primitive uses `lucide-react` icons THEN they SHALL be swapped to
  `@phosphor-icons/react` per `components.json`.
- WHEN a primitive ships a `cn` import THEN it SHALL resolve to the existing
  `@kizunu/web/lib/utils` helper (not a duplicate).

---

## Requirement Traceability

| Requirement ID | Story                              | Phase   | Status  |
| -------------- | ---------------------------------- | ------- | ------- |
| SHADCN-01      | P1: Rule written in react.md       | Execute | Pending |
| SHADCN-02      | P1: Convention in .specs docs      | Execute | Pending |
| SHADCN-03      | P1: Primitives baseline installed  | Execute | Pending |
| SHADCN-04      | P1: bun check green                | Execute | Pending |

**Coverage:** 4 total, all mapped to execution steps.

---

## Success Criteria

- [ ] `.agents/rules/react.md` contains the shadcn-first rule with examples.
- [ ] `.specs/codebase/` docs reflect the convention.
- [ ] `apps/web/src/components/primitives/` holds the foundational baseline, sourced
      via the shadcn skill/CLI, with project-correct imports and icons.
- [ ] `bun check` is green.
