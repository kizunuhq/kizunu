# Web Patterns

These rules apply to `apps/web/`. They complement `react.md` (UI primitives)
and `comments.md` (no narration / no section markers / English only) by
prescribing how a feature is laid out, how forms and dialogs compose, how URL
state is wired, and what shape API hooks expose. They are not script-gated;
review enforces them. The decisions behind these recipes are recorded in
[ADR-007](../../docs/adr/007-web-frontend-layering.md).

## 1. Layering — route-colocation

A web feature lives under its route folder, not in a sibling `features/`
tree. The TanStack Router `-` prefix marks folders as non-route.

```
apps/web/src/routes/_app/<feature>/
├── index.tsx              # list / landing route
├── new.tsx                # create route (when applicable)
├── $<entity>Id.tsx        # detail / edit route (when applicable)
├── -components/           # JSX exclusive to this feature
├── -hooks/                # hooks exclusive to this feature (URL state, etc.)
├── -utils/                # pure helpers exclusive to this feature
└── -dialogs/              # feature-local dialog wrappers (optional)
```

A piece graduates to `apps/web/src/components/composed/` only when **two or
more** features consume it. Primitives stay in `apps/web/src/components/
primitives/` (shadcn-installed; see `react.md` §0).

**Flat-file feature-routes.** When a feature is a flat file
(`<feature>.tsx`) rather than a folder (`<feature>/index.tsx`), the `-`-
prefixed sibling folders live one level up under the area:

```
apps/web/src/routes/_app/<area>/
├── <feature>.tsx           # flat feature-route
├── -components/<feature>/  # JSX exclusive to this feature
├── -dialogs/               # dialog wrappers grouped per-area
│   ├── create-<feature-a>-dialog.tsx
│   ├── delete-<feature-a>-dialog.tsx
│   └── ...
└── -utils/                 # pure helpers grouped per-area
```

This is the pragmatic placement while feature-routes are flat files (e.g.
`routes/_app/settings/channels.tsx`). When an area's `-dialogs/` folder
grows past ~8 files or starts mixing concerns, **promote the feature-route
to a folder** (`channels/index.tsx`) so its dialogs/components can live in
the canonical `<feature>/-dialogs/` location. Don't split the difference —
either every feature in the area has its own folder or they all share the
area's `-`-folders.

The legacy layout `apps/web/src/features/<feature>/` is **deprecated for new
work**. Existing folders convert opportunistically — when a feature is next
worked on for an unrelated reason that already touches its tree, the same PR
moves it into the route-colocated form. Surface-only edits (a copy fix, a
single className tweak) do not trigger the migration. Mixed layouts during
the transition are explicitly tolerated.

## 2. Page recipe

A page reads data, owns ephemeral state (open/closed, selected row), and
declares side-effects via hook callbacks. It composes the existing
`PageHeader`, `DataTable`, and `EmptyState` from `components/composed/`.

```tsx
// routes/_app/instruments/index.tsx
import { useInstruments } from '@kizunu/api-client/instrument/use-instruments'
import { Button } from '@kizunu/web/components/primitives/button'
import { DataTable } from '@kizunu/web/components/composed/data-table'
import { EmptyState } from '@kizunu/web/components/composed/empty-state'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Wrench } from '@phosphor-icons/react'
import { getInstrumentColumns } from './-utils/columns'

export const Route = createFileRoute('/_app/instruments/')({
  component: InstrumentsPage,
})

function InstrumentsPage() {
  const navigate = useNavigate()
  const { data, isPending, error, refetch } = useInstruments()

  if (error) {
    return (
      <EmptyState
        title="Could not load instruments"
        description="Something went wrong fetching the list."
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instruments"
        actions={<Button onClick={() => navigate({ to: './new' })}>New instrument</Button>}
      />
      <DataTable
        columns={getInstrumentColumns()}
        rows={data?.items ?? []}
        isPending={isPending}
        rowKey={(row) => row.id}
        emptyTitle="No instruments yet"
        emptyDescription="Create the first one to get started."
        onRowClick={(row) => navigate({ to: './$instrumentId', params: { instrumentId: row.id } })}
      />
    </div>
  )
}
```

Notes:

- Data loading is via hooks **inside the component**. Do not use TanStack
  Router loaders for data-loading in this codebase.
- Per-page error states use `EmptyState` with a retry action; per-mutation
  errors follow the table in §7.
- The route file stays short. Anything past the page component's body goes
  into `-components/` or `-utils/`.

## 3. Form recipe — smart page + dumb form

The form is a dumb component that knows nothing about navigation, toasts, or
API state. It receives `{ formId, defaultValues, isPending, onSubmit, error }`
and renders fields. The page is the smart layer: it owns the mutation hook
and declares side-effects.

Forms use plain `useState` + a `submit` handler that calls
`event.preventDefault()` and invokes the mutation. This matches every
existing form in `apps/web` (`login-form.tsx`, `invite-member-form.tsx`,
`connector-account-form.tsx`, ...). When a future feature has a form complex
enough to warrant `react-hook-form` (it is already a dependency), introduce
it locally for that form — do not retrofit the whole codebase.

```tsx
// routes/_app/instruments/-components/instrument-form.tsx
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

interface InstrumentFormProps {
  formId: string
  defaultValues?: { name?: string }
  isPending: boolean
  onSubmit: (data: { name: string }) => void
  error?: string | null
}

export function InstrumentForm(props: InstrumentFormProps) {
  const { formId, defaultValues, isPending, onSubmit, error } = props
  const [name, setName] = useState(defaultValues?.name ?? '')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({ name })
  }

  return (
    <form id={formId} onSubmit={submit} className="space-y-4">
      {error && <FormError>{error}</FormError>}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </Field>
      </FieldGroup>
    </form>
  )
}
```

The submit button lives **outside** the form via `form={formId}`. The page
declares side-effects on the hook (`onSuccess`, `onError`) — no `try/catch`
in the submit handler.

```tsx
// routes/_app/instruments/new.tsx
function NewInstrumentPage() {
  const navigate = useNavigate()
  const formId = 'create-instrument-form'
  const [apiError, setApiError] = useState<string | null>(null)

  const { createInstrument, isPending } = useCreateInstrument({
    onSuccess: (result) => {
      toast.success('Instrument created')
      navigate({ to: './$instrumentId', params: { instrumentId: result.id } })
    },
    onError: (err) => setApiError(getApiErrorMessage(err)),
  })

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="New instrument" />
      <InstrumentForm
        formId={formId}
        isPending={isPending}
        error={apiError}
        onSubmit={(data) => {
          setApiError(null)
          createInstrument(data)
        }}
      />
      <div className="flex gap-2">
        <Button form={formId} type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: '..' })}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
```

Notes:

- Form-component file ≤50 lines (`react.md` §9). Past that, split into
  smaller field groupings under `-components/`.
- Validation happens at the contract: the API rejects bad input and the
  mutation's `onError` surfaces the message via `FormError`. Native HTML
  validation (`required`, `type="email"`, `pattern`) handles obvious
  client-side guards.
- `FormError` (not `toast.error`) is used inside a form-bearing surface so
  the error stays in context. Toasts are for mutations outside a form
  surface — see §7.

## 4. URL-state recipe — Zod schema + `use-<feature>-search` hook

List/filter routes export a Zod schema for search params and a dedicated
hook that wraps `Route.useSearch()` with typed update handlers.

```tsx
// routes/_app/instruments/-hooks/use-instruments-search.ts
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Route } from '../index'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

export const instrumentsSearchSchema = z.object({
  page: z.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
})

export type InstrumentsSearch = z.infer<typeof instrumentsSearchSchema>

export function useInstrumentsSearch() {
  const searchValues = Route.useSearch()
  const navigate = useNavigate()

  function updateSearch(patch: Partial<InstrumentsSearch>) {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, ...patch, ...('page' in patch ? {} : { page: 1 }) }),
      replace: true,
    })
  }

  return {
    searchValues,
    updateSearch,
    handlePageChange: (page: number) => updateSearch({ page }),
    hasActiveSearch: Boolean(searchValues.search),
  }
}
```

The route file registers the schema:

```tsx
import { instrumentsSearchSchema } from './-hooks/use-instruments-search'

export const Route = createFileRoute('/_app/instruments/')({
  component: InstrumentsPage,
  validateSearch: instrumentsSearchSchema,
})
```

Notes:

- The hook imports `Route` from the route file so `Route.useSearch()` is
  type-safe against the registered schema.
- `navigate({ to: '.', search, replace: true })` updates the URL without
  pushing a history entry — correct UX for filter / pagination changes.
- Page resets to 1 on any filter change. Only an explicit `page` patch keeps
  the page value.
- Default values live in the schema. Components read `searchValues` and
  trust it.

## 5. Data table recipe

The existing `DataTable` API is the contract. Use `footer={<TablePagination
... />}` for paginated lists; `onRowClick` for clickable rows.

```tsx
<DataTable
  columns={getInstrumentColumns()}
  rows={data?.items ?? []}
  isPending={isPending}
  rowKey={(row) => row.id}
  emptyTitle={hasActiveSearch ? 'No matches' : 'No instruments yet'}
  emptyDescription={hasActiveSearch ? 'Try a different filter.' : 'Create the first one.'}
  onRowClick={(row) => navigate({ to: './$instrumentId', params: { instrumentId: row.id } })}
  footer={
    <TablePagination
      page={searchValues.page}
      pageSize={searchValues.pageSize}
      totalCount={data?.total ?? 0}
      pageCount={data?.totalPages ?? 0}
      onPageChange={handlePageChange}
    />
  }
/>
```

Notes:

- Columns are defined as `{ key, header, cell, align? }` and built in
  `-utils/columns.tsx`. Keep `cell` thin — extract row-level UI into a
  `-components/` file when it grows.
- Distinguish "no data" from "no matches" via the URL hook's
  `hasActiveSearch`.
- Row actions live in the last column as a `DropdownMenu` triggered by an
  icon button. Callbacks open dialogs the page owns (§6).
- Sort is not yet wired into `DataTable`; add `sortField` / `sortDir` /
  `onSortChange` props when a feature needs them. The recipe stays the same
  — the search hook gains a `toggleSort(field)` handler.

## 6. Dialog recipe

`ResourceDialog` provides the standard chrome (header → scrollable body →
footer). Create/edit dialogs put a `<form id={formId}>` inside and pass
`formId` so the action button submits the form. `DeleteResourceDialog`
handles destructive confirmation with a typed-name guard.

```tsx
function CreateInstrumentDialog({ open, onOpenChange }: Props) {
  const formId = 'create-instrument-dialog-form'
  const [apiError, setApiError] = useState<string | null>(null)
  const { createInstrument, isPending } = useCreateInstrument({
    onSuccess: () => {
      toast.success('Instrument created')
      onOpenChange(false)
    },
    onError: (err) => setApiError(getApiErrorMessage(err)),
  })

  return (
    <ResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New instrument"
      actionLabel="Create"
      formId={formId}
      isPending={isPending}
    >
      <InstrumentForm
        formId={formId}
        isPending={isPending}
        error={apiError}
        onSubmit={(data) => {
          setApiError(null)
          createInstrument(data)
        }}
      />
    </ResourceDialog>
  )
}
```

Destructive:

```tsx
<DeleteResourceDialog
  open={Boolean(deleting)}
  onOpenChange={(next) => !next && setDeleting(null)}
  resourceType="instrument"
  resourceName={deleting?.name ?? ''}
  onDelete={() => deleteInstrument({ id: deleting!.id })}
  isDeleting={isDeleting}
  errorMessage={deleteError}
/>
```

Notes:

- Parent owns `open` and `editing`/`deleting` state (the resource being
  edited or deleted). The dialog itself is stateless beyond ephemeral
  inputs.
- Prevent close while a mutation is in flight (`isPending` propagates to the
  Cancel button as `disabled`).
- **Use `useMutationDialog`** from `@kizunu/web/lib/use-mutation-dialog`
  inside every wrapper. It owns the apiError state, the clear-on-close
  reset, and the `captureError` → `getApiErrorMessage` mapping so each
  wrapper stays focused on its hook + form + labels (~25 lines instead of
  ~50). Every dialog wrapper takes `{ ...resource?, open, onOpenChange }`
  — never split into `onClose`-only or `resource | null`-only shapes.
- For non-CRUD features (cadence builder, command palette, wizards) the
  layering and smart/dumb split still apply, but the `DataTable` /
  `ResourceDialog` recipes are optional — this rule is a recipe book, not a
  straitjacket.

## 7. Error handling

| Surface | Pattern |
| ------- | ------- |
| Query failure on a page | `EmptyState` with a retry action |
| Mutation failure on a form page | `FormError` above the fields |
| Mutation failure inside a create/edit dialog | `FormError` inside the dialog body |
| Mutation failure for an action-only dialog or background action | `toast.error(getApiErrorMessage(err))` |
| Uncaught render crash | Route error boundary |

Always go through `@kizunu/web/lib/get-api-error-message` to extract the
display message — never read `error.message` directly at the call site.

## 8. API client — shape and invalidation

The two-layer api-client (`*.api.ts` pure fetch + `use-*.ts` TanStack Query
wrapper) is documented in `ARCHITECTURE.md` "End-to-end type-safe API
boundary". This rule adds two contracts on top.

**Mutation hook return shape.** New mutation hooks return
`{ <domainName>: mutate, ...rest }`, where `<domainName>` matches the use
case:

```ts
// packages/api-client/src/instrument/use-create-instrument.ts
export function useCreateInstrument(options: Options = {}) {
  const queryClient = useQueryClient()
  const { mutate, ...rest } = useMutation({
    mutationFn: createInstrument,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.instruments] })
      options.onSuccess?.(data, variables, context)
    },
  })
  return { ...rest, createInstrument: mutate }
}
```

**Invalidation ownership.** The hook calls `invalidateQueries` for keys it
semantically owns, then chains the caller's `options.onSuccess`. The caller
is responsible only for side-effects (toast, navigate).

**Transition clause.** Existing hooks under `packages/api-client/*/use-*.ts`
keep their current raw shape until they are next touched. Mixed shapes are
explicitly tolerated. There is no obligation to sweep — refactor a hook only
when a PR is already in its file.

**Query keys.** Keys live in `packages/api-client/src/query-keys.ts`. New
list keys are added to the `QueryKeys` object; per-id detail keys compose
inline (`[QueryKeys.instruments, id]`).

## 9. Hard rules and gates

The patterns above must respect existing rules:

- **English only.** All identifiers, comments, and code strings are English.
  User-facing copy is English by default; localization happens at its own
  layer when introduced. (`code-standards.md` §1)
- **No section-marker comments.** No `// 1.`, `// 2.`, no `// Arrange / Act
  / Assert`, no banner dividers. Structure is carried by blank lines and
  function boundaries. (`comments.md` §4)
- **No restating-the-code comments.** Default to no comments; allow only
  where the *why* is non-obvious. (`comments.md` §1–§2)
- **Components ≤50 lines, functions ≤30 lines, ≤3 positional params, no
  `switch/case`.** (`react.md` §9, `code-standards.md` §10/§6/§7)
- **Primitives are shadcn-first.** Composites in `components/composed/` are
  built on shadcn primitives in `components/primitives/`. (`react.md` §0)
- **Zod top-level formats** (`z.email()`, not `z.string().email()`).
  Enforced by `scripts/check-zod-v4.ts`. (`conventions.md` §1)

## 10. New-feature checklist

When starting a new CRUD-ish web feature:

1. Add the contracts under `packages/api-contracts/src/<bc>/<feature>.contract.ts`
   (request/response schemas + Route entries).
2. Add api functions under `packages/api-client/src/<bc>/<feature>.api.ts`
   (pure fetch).
3. Add query/mutation hooks under
   `packages/api-client/src/<bc>/use-<verb>-<entity>.ts`. New mutation hooks
   follow §8 shape and invalidation.
4. Add query-key entries to `packages/api-client/src/query-keys.ts`.
5. Create route folder under `apps/web/src/routes/_app/<feature>/` with
   `index.tsx` + any of `new.tsx` / `$<entity>Id.tsx`.
6. Create `-hooks/use-<feature>-search.ts` for URL-driven state (§4) if the
   feature has a filterable/paginated list.
7. Create `-utils/columns.tsx` for the `DataTable` column definitions.
8. Create `-components/<feature>-form.tsx` and any dumb child components.
9. Add navigation entry under `apps/web/src/features/app-shell/data/` (the
   one remaining legitimate `features/` reference — the app shell's nav
   data lives there until its own future migration).
