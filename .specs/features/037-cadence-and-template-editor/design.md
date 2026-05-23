# Cadence and Template Editor Design

**Spec**: `.specs/features/037-cadence-and-template-editor/spec.md`

---

## Architecture

```
routes/_app/workspace/cadences.tsx (route — gets validateSearch for ?tab=)
└── CadenceTemplatesView (NEW — composes Tabs + sub-views)
    ├── PageHeader
    └── Tabs
        ├── Cadences tab
        │   ├── CadencesTable (existing)
        │   └── CadenceBuilder (existing, hidden behind a "+ New cadence" disclosure unless list is empty)
        └── Templates tab
            ├── TemplatesTable (existing)
            └── TemplateForm (existing, same disclosure pattern)
```

---

## Components

### `CadenceTemplatesView` (NEW)

- **Location**: `apps/web/src/features/cadence/components/cadence-templates-view.tsx`
- **Props**: `{ workspaceId: string; activeTab: 'cadences' | 'templates'; onTabChange: (tab: 'cadences' | 'templates') => void }`
- **Renders**: PageHeader + Tabs; each tab renders the existing list above a Collapsible "New …" disclosure.

### `CadencesManager` (deleted)

The old 2×2 grid manager goes away; the route component takes over composition.

### `cadences.tsx` route (modified)

- Reads `?tab` via `validateSearch`.
- Renders `<CadenceTemplatesView />` with the active tab and a `navigate` handler that writes the new tab back to the search.

### Tabs primitive

- Install shadcn `tabs` primitive (no existing tabs primitive in the project).
- Patch IconPlaceholder usage if needed (same fix pattern as Part 1).

### EmptyState wrappers

- One `EmptyState` per tab when the list is empty, with copy directing the user at the "+ New" disclosure below.

---

## Reuse

- `PageHeader`, `EmptyState` (Part 1)
- `Table`, `Card`, etc. (existing primitives)
- `CadencesTable`, `TemplatesTable`, `CadenceBuilder`, `TemplateForm` (existing, unchanged content)
- Hooks: `useCadences`, `useTemplates`, `useCreateCadence`, `useCreateTemplate`, `useDeleteCadence`, `useDeleteTemplate`

---

## Tests

All thin presentational → no dedicated tests.

---

## Migration

Single PR. `CadencesManager` deleted (only the cadences route imported it); the route renders the new view directly.
