# Settings Hub Tasks

**Design**: `.specs/features/036-settings-hub/design.md`

## Tasks

T1: Create `routes/_app/settings/route.tsx` with `SettingsLayout` + sub-nav data.
T2: Move members page from `/workspace/` to `/settings/`. Add `PageHeader`. Delete old.
T3: Move channels page. Same.
T4: Move connectors page. Same.
T5: Move security page. Same.
T6: NEW `profile.tsx`.
T7: NEW `workspace.tsx`.
T8: NEW `billing.tsx`.
T9: Update `NAV_GROUPS` — collapse second group to a single Settings link.
T10: Update Part 1's stub `/settings/profile` route — replace with Part 4's real content (delete the Part 1 placeholder, T6 covers).
T11: bun check.
T12: Chrome validation.
T13: PR + CI + squash.

All tests classification: thin → none.
