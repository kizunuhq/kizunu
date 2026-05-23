# Power-User Polish Tasks

T1: Install shadcn `command` + `dialog` primitives; patch IconPlaceholder if present.
T2: Build `CommandPalette` composing Dialog + cmdk + groups + items + sign-out.
T3: Build `ShortcutsModal` (Dialog + static list of bound shortcuts).
T4: Wire ⌘K (new direct keydown listener) + `?` (existing `useHotkey`) into `AppShell`'s `ShellHotkey` sub-component.
T5: bun check.
T6: Chrome validation (palette opens, filters, navigates, closes; shortcuts modal opens).
T7: PR + CI + squash.

All thin → no dedicated tests.
