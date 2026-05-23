# Power-User Polish Design

**Spec**: `.specs/features/039-power-user-polish/spec.md`

---

## Architecture

```
AppShell (modified to register the global hotkeys)
├── ⌘K → CommandPalette open
├── ?  → ShortcutsModal open
└── existing children

CommandPalette (NEW)
├── shadcn Dialog wrapping the cmdk Command primitive
├── CommandInput
├── CommandList
│   ├── CommandGroup "Pages" (4 items)
│   ├── CommandGroup "Settings" (7 items)
│   └── CommandGroup "Account" (1 item — Sign out)

ShortcutsModal (NEW)
├── shadcn Dialog
└── list of <Kbd>...</Kbd> rows with short labels
```

---

## Components

### `CommandPalette` (NEW)

- **Location**: `apps/web/src/features/command/components/command-palette.tsx`
- **Props**: `{ open: boolean; onOpenChange: (open: boolean) => void }`
- **Renders**: Dialog → Command (cmdk) → CommandInput + CommandList + CommandGroup(s) + CommandItem(s).
- **Items**: hardcoded `COMMAND_ITEMS` array with `{ id, label, group, kind: 'navigate' | 'action', target?: string, onSelect?: () => void }`.
- **Behavior**:
  - Navigate items call `navigate({ to: target, search: ... })` and close the palette.
  - Action items call `onSelect()` and close.
  - Sign-out: `useLogout` + redirect to `/auth/login`.

### `ShortcutsModal` (NEW)

- **Location**: `apps/web/src/features/command/components/shortcuts-modal.tsx`
- **Props**: same shape.
- **Renders**: Dialog with a static list of shortcuts (⌘K, `[`, `?`).

### `CommandRegistry` (data)

- **Location**: `apps/web/src/features/command/data/command-items.ts`
- **Shape**: const-object per `.agents/rules/enums.md` for the group kinds; the items themselves are a typed array.

### `useGlobalHotkeys` (small composition)

- **Location**: `apps/web/src/features/command/hooks/use-global-hotkeys.ts`
- **Behavior**: Registers `⌘K` and `?` via two `useHotkey` calls. For `⌘K`, special-case the modifier check (the existing `useHotkey` skips for inputs but the ⌘ chord should override that; we add a separate small handler).

Actually simpler: ⌘K is detected with `event.metaKey || event.ctrlKey` + `event.key === 'k'`. The existing `useHotkey` matches on `event.key` only. For `⌘K` we use a new direct event listener inside `AppShell`'s `ShellHotkey` component — same pattern, just a different key-check.

`?` uses the existing `useHotkey` (works because the input-skip guard correctly prevents firing in inputs).

---

## Installs

- shadcn `command` primitive — needed for the palette content
- shadcn `dialog` primitive — needed to host the palette and shortcuts modal

---

## Reuse

- `useHotkey` (Part 1) for `?` and overlay-open guard
- `useLogout` for sign out
- `Kbd` composed primitive (Part 1) for the shortcuts modal
- TanStack Router `useNavigate` for command targets

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| ⌘K detection | A second `useEffect` in the shell with explicit `event.metaKey \|\| event.ctrlKey` + `event.key === 'k'` checks | The existing `useHotkey` skips inputs by default; ⌘K must work everywhere (browser convention). |
| `?` detection | Existing `useHotkey('?')` | The input-skip guard is the right behavior — `?` typed into a search box should land in the box. |
| Palette filtering | cmdk's built-in filter | shadcn ships this; no custom logic needed. |
| Shortcuts modal "?" | A static Dialog | Simpler than a full overlay framework; lists 3 shortcuts. |
| Sign-out item | Inside the palette, third group | One more way to sign out; reuses the user-dropdown's path. |

---

## Tests

All thin (palette is composition; the items array is data) → none.

---

## Migration

Single PR. Adds the palette + modal to the existing `AppShell`; no route changes.
