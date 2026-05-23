# Power-User Polish Specification

## Problem Statement

The dashboard has all the structure, but it's mouse-first. The sidebar
hotkey (`[`) shipped in Part 1, but there's no way to navigate the app
without leaving the keyboard. Sales operators live in this dashboard all
day; they need a command palette to jump anywhere instantly and a
keyboard-shortcuts reference. This part lands those two affordances.

## Goals

- [ ] Command palette (⌘K) that lists every navigable destination and
      every primary action, grouped into categories (Pages, Settings).
- [ ] Keyboard shortcuts modal (`?`) showing every bound shortcut +
      its purpose.
- [ ] Both surfaces compose `cmdk` (the shadcn `command` primitive) and
      respect the `useHotkey` guards from Part 1.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Multi-key chord shortcuts (e.g. `g j`, `g c`) | Adds a keystroke-buffer abstraction; ⌘K covers the same navigation surface with one chord. |
| Search across data (lead names, cadence names) inside the palette | Requires a backend search endpoint. The palette ships navigation only. |
| Custom shortcut binding | Out of scope for v0.1. |
| Per-screen contextual commands | Defer; only global commands ship. |
| Motion polish across every screen | The shell already follows DESIGN.md §5 (opacity + transform, 150–250ms ease-out); spot-check during validation rather than systematically. |
| Dark mode QA pass | Already audited during impeccable polish on Part 1. |

---

## User Stories

### P1: Command palette opens with ⌘K and navigates ⭐ MVP

**Acceptance Criteria**:
1. WHEN the user presses ⌘K (or ctrl+K on non-mac) on any authenticated route THEN the command palette SHALL open above the page in a centered modal.
2. WHEN the palette is open THEN the user SHALL be able to type to filter; the filtered list SHALL update in real time.
3. WHEN the user presses Enter on a focused command THEN the palette SHALL close and navigate to the command's target route.
4. WHEN the user presses Escape THEN the palette SHALL close without navigating.
5. WHEN the palette renders THEN it SHALL group commands into "Pages" (Overview, Journeys, Cadences, My channels) and "Settings" (Profile, Workspace, Members, Channels, Connectors, Security, Billing). Each group label uses the mono kicker style.
6. WHEN the `?` key is pressed on any authenticated route THEN the keyboard-shortcuts modal SHALL open listing every bound shortcut with its purpose.

---

### P2: Sign out from the command palette

**Acceptance Criteria**:
1. WHEN the palette renders THEN it SHALL include a "Sign out" command in a third group ("Account"). Selecting it logs out and routes to `/auth/login` (same as the user-dropdown sign-out path).

---

## Edge Cases

- WHEN the user is typing inside a real input/textarea/contenteditable AND presses ⌘K THEN the palette SHALL still open (⌘K is universal; the hotkey skip-target guard doesn't apply when a modifier key is pressed).
- WHEN the palette is open AND the user presses `[` THEN the sidebar SHALL NOT toggle (existing useHotkey overlay-open guard covers this).
- WHEN the palette is open AND `?` is pressed inside the search input THEN the search input SHALL receive the keystroke; the shortcuts modal SHALL NOT open (the existing useHotkey input-skip guard covers this).

---

## Requirement Traceability

| ID | Story | Status |
| -- | ----- | ------ |
| POW-01 | P1: ⌘K opens palette | Pending |
| POW-02 | P1: type-to-filter | Pending |
| POW-03 | P1: Enter navigates, Escape closes | Pending |
| POW-04 | P1: Pages + Settings groups with mono kickers | Pending |
| POW-05 | P1: ? opens shortcuts modal | Pending |
| POW-06 | P2: Sign out from palette | Pending |

---

## Success Criteria

- [ ] ⌘K opens the palette on any authenticated route.
- [ ] `?` opens the shortcuts modal.
- [ ] Both close on Escape.
- [ ] `bun check` is green.
- [ ] Chrome validation confirms the palette opens, filters, navigates, closes.
