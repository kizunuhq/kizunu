# Roadmap Creation

**Trigger:** "Create roadmap", "Plan features", "Map project phases"

## Process

Based on PROJECT.md, decompose vision into:

- Milestones (shippable increments)
- Features (user-facing capabilities)
- Status tracking (planned/in-progress/complete)

## Output: .specs/project/ROADMAP.md

**Structure:**

```markdown
# Roadmap

**Current Milestone:** [milestone name]
**Status:** Planning | In Progress | Complete

---

## [Milestone 1 Name]

**Goal:** [What makes this milestone shippable]
**Target:** [Date or completion criteria]

### Features

**[Feature Name]** - STATUS

- [Capability 1]
- [Capability 2]
- [Capability 3]

**[Feature Name]** - STATUS

- [Capability 1]
- [Capability 2]

---

## [Milestone 2 Name]

**Goal:** [What this milestone adds]

### Features

**[Feature Name]** - PLANNED
**[Feature Name]** - PLANNED

---

## Future Considerations

- [Potential future capability]
- [Potential future capability]
```

**Status values:**

- PLANNED: Not started
- IN PROGRESS: Currently implementing
- COMPLETE: Shipped and verified — and on a project using HISTORY.md (see §Scaling), the entry has moved out of ROADMAP.md by now

**Size limit:** 3,000 tokens (~1,800 words). If ROADMAP keeps drifting past this limit, the project has outgrown the Milestone shape — adopt the Now/Next/Later shape below and split shipped features into HISTORY.md.

**Update strategy:**

- Mark features PLANNED → IN PROGRESS when starting
- Mark IN PROGRESS → COMPLETE when verified
- Add new milestones as project evolves
- When ROADMAP grows past two screens, sweep COMPLETE features into HISTORY.md (see §Scaling)

**Validation:**

- Each milestone has clear shippable outcome?
- Features are user-facing capabilities?
- Status reflects current reality?
- ROADMAP still forward-looking, or has it become a changelog? (If the latter, see §Scaling.)

## Scaling: Now / Next / Later + HISTORY.md

The Milestone template above works for projects with a small, well-bounded
horizon (v0.1, v0.2, …). Projects that ship continuously without versioned
releases — or that have already accumulated dozens of shipped features —
outgrow it: ROADMAP becomes an append-only changelog the agent loads every
session, costing context and obscuring what's actually next.

**The fix is structural, not cosmetic:** separate the forward-looking artifact
from the rear-view mirror.

### When to switch

Switch from the Milestone template above to the Now/Next/Later template below when
any of these become true:

- ROADMAP.md grew past the 3k-token size limit and most of the bulk is COMPLETE entries.
- You find yourself appending phases as the project evolves (Phase 1.5, 1.6, …) without those phases being real release boundaries.
- Agents loading ROADMAP for planning pay context cost on past work that no longer informs the next decision.

### Now / Next / Later structure

```markdown
# Roadmap

**Current focus:** [one line — the live theme/phase]

Forward-looking only. Features collapse to HISTORY.md the moment they ship.

---

## Now

[Features currently PLANNED or IN PROGRESS. One block per feature: title + status + scope bullets.]

## Next

[Queued for after Now clears. Source: open risks/concerns, active customer feedback, deferred slices below.]

## Later

[Known deferred work, roughly ordered by likelihood we pick it up next. Brief — one bullet each.]

---

## Past

Past phases collapse to one line. Full feature blurbs in HISTORY.md.

- **[Phase / theme name]** — COMPLETE. Features [NNN]–[NNN].
- **[Phase / theme name]** — COMPLETE. Features [NNN]–[NNN].

---

## Future Considerations

[Long-horizon ideas that aren't planned but worth recording.]
```

### HISTORY.md — the rear-view mirror

`HISTORY.md` is an optional sibling under `.specs/project/`. It is append-only,
not loaded by default, and lives where ROADMAP's COMPLETE entries go when they
graduate.

**Structure:** group by phase (or release / theme), then list features in
feature-number order. Each entry keeps its original `_Landed (feature NNN)…_`
blurb, the scope bullets that preceded it, and any architectural lesson the
slice produced that doesn't belong in STATE.md's durable Lessons.

```markdown
# History

Append-only changelog of shipped features. ROADMAP.md is the forward-looking
artifact; this file is the rear-view mirror.

---

## [Phase / theme name]

**Goal:** [original goal]

**[Feature Name]** — COMPLETE

- [original scope bullets]
- _Landed (feature NNN): [the blurb]._

...
```

### Lifecycle: how a feature moves between the two

1. Feature gets added to `ROADMAP.md` under **Now** (or **Next** if not yet started).
2. While in flight, status flips PLANNED → IN PROGRESS in ROADMAP.
3. At ship time (squash to main, all gates green), the feature's block **moves out of ROADMAP.md** entirely and appends to the matching phase section in `HISTORY.md` as COMPLETE.
4. If the project's main agent guide (e.g. `AGENTS.md`, `CLAUDE.md`) describes the development flow, mention the move as part of the ship step so it doesn't drift back into ROADMAP.

### Loading rules (mirror in SKILL.md "Context Loading Strategy")

- ROADMAP.md stays in the **base load**. It's small by construction now.
- HISTORY.md is **on-demand only**. Load it when the user asks "what shipped in phase X?", when a regression points back at a past feature, or when a new feature has to reuse a pattern documented there. Never auto-load it for routine planning.
- STATE.md keeps **durable** decisions, blockers, architectural lessons. Per-feature recall (`_Landed (NNN)…_` style) belongs in HISTORY.md, not STATE.md.
