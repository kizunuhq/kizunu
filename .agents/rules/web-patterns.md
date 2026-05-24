# Web Patterns

These rules apply to `apps/web/`. They complement `react.md` (UI primitives)
and `comments.md` (no narration / no section markers / English only) by
prescribing how a feature is laid out, how forms and dialogs compose, how URL
state is wired, and what shape API hooks expose. They are not script-gated;
review enforces them. The decisions behind these recipes are recorded in
[ADR-007](../../docs/adr/007-web-frontend-layering.md).

## 1. Layering — per-feature route-colocation

Every web feature lives in its **own folder** under the route tree, with
the route file as `index.tsx`. There are no flat-file feature-routes
sharing area-level `-`-folders — every feature owns its own
`-components/`, `-hooks/`, `-utils/`, `-dialogs/`. The TanStack Router
`-` prefix marks folders as non-route.

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

**Areas with multiple feature-routes** (e.g. `routes/_app/settings/`,
`routes/_app/workspace/`, `routes/auth/`) are folders containing one
per-feature subfolder per route. Area-level `-components/` and `-utils/`
are reserved for **cross-feature** concerns:

- area-root content consumed by the area's own `route.tsx` (when the
  area is a layout) or `index.tsx` (when the area itself is a page)
  (e.g. `auth/-components/auth-branding-panel.tsx` for `auth/route.tsx`'s
  layout, `workspace/-components/dashboard/*` for `workspace/index.tsx`'s
  dashboard page);
- helpers consumed by **two or more** feature-routes inside the area but
  too area-specific to graduate to `components/composed/` or `lib/`
  (e.g. `auth/-utils/login-error-copy.ts` consumed by login, signup, and
  reset-password).

Feature-specific code never lives at the area level. The "split the
difference" shape — per-feature subfolders next to area-shared flat files
serving single features — is a review reject.

The legacy layout `apps/web/src/features/<feature>/` is **removed**. If a
stray reference is ever found, migrate it in the same PR — there is no
transition clause to lean on.

## 1.5. No naked container routes

**Reject criterion.** A folder containing a `route.tsx` layout but no
sibling `index.tsx` is the bug shape: the user lands on the layout
chrome wrapped around an empty `<Outlet />`. Reviews reject it on sight.

Every folder under `routes/` whose **segment appears in the URL** must
respond meaningfully at the bare URL. Two valid shapes:

1. **Renders a page** — `index.tsx` defines a `component:` that draws the
   bare URL (e.g. `routes/_app/workspace/index.tsx` is the dashboard).
2. **Redirects** — `index.tsx` defines `beforeLoad` that throws a
   `redirect()` to a sensible default child. No `component:` declared;
   the throw short-circuits before render.

```tsx
// routes/auth/index.tsx — /auth → /auth/login
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login' })
  },
})
```

Two folder shapes are **exempt** because their segment is not in the URL:

- **Route groups** `(area)/` — TanStack's parens-wrapped folders. The
  segment is dropped from the URL; children become top-level paths. No
  bare URL exists, so nothing to land on.
- **Pathless layouts** `_area/` — TanStack's underscore-prefixed folders
  (e.g. `_app/`). Same reason: the segment never appears in the URL.

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

The form is a dumb component that knows nothing about navigation, toasts,
or mutation state. It receives `{ formId, defaultValues?, isPending, onSubmit,
error? }` and renders fields. The page is the smart layer: it owns the
mutation hook and declares side-effects.

**Forms own `useForm` bound to a contract schema. Per-field `useState` is
forbidden in form components.** Field state, dirty tracking, double-submit
guard, and `defaultValues` for edit mode all come from `react-hook-form`.
Validation comes from the `*RequestSchema` in `@kizunu/api-contracts` plugged
into `zodResolver` — no native `required`, no hand-rolled validation
helpers. The decision is recorded in
[ADR-008](../../docs/adr/008-forms-react-hook-form-zod.md).

Two error surfaces, deliberately separate:

| Surface | Source | Component |
| --- | --- | --- |
| Field-level | RHF `errors.<field>.message` (zodResolver) | `<FieldError id="<field>-error">` inside the `<Field>`, with `aria-invalid` + `aria-describedby` on the input |
| Top-of-form | server error string from the parent (`useMutationDialog` for dialogs, smart-page local state for auth) | `<FormError>{error}</FormError>` at the top of `<FieldGroup>` |

### 3.a Native input recipe

```tsx
// routes/_app/instruments/-components/instrument-form.tsx
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CreateInstrumentRequest,
  CreateInstrumentRequestSchema,
} from '@kizunu/api-contracts/instrument'
import { FormError } from '@kizunu/web/components/composed/form-error'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useForm } from 'react-hook-form'

interface InstrumentFormProps {
  formId: string
  defaultValues?: Partial<CreateInstrumentRequest>
  isPending: boolean
  error?: string | null
  onSubmit: (data: CreateInstrumentRequest) => void
}

export function InstrumentForm(props: InstrumentFormProps) {
  const { formId, defaultValues, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInstrumentRequest>({
    resolver: zodResolver(CreateInstrumentRequestSchema),
    defaultValues,
  })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && (
            <FieldError id="name-error">{errors.name.message}</FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}
```

**Shortcut: `<RhfField>`.** The native-input block above is repetitive
(`Field` + `FieldLabel` + `Input` + the a11y triad + `FieldError`). The
composed `<RhfField>` primitive
(`apps/web/src/components/composed/rhf-field.tsx`) bundles all of it:

```tsx
<RhfField
  name="name"
  label="Name"
  register={register}
  error={errors.name}
  disabled={isPending}
/>
```

Use `<RhfField>` as the default for native inputs; the explicit block
above is what it expands to — reach for it when you need an attribute
the wrapper doesn't expose (custom `className`, `inputMode`, etc.).

### 3.b Controlled-component recipe — `<Controller>`

`register()` cannot reach into a controlled component (`LookupSelect`,
`PluginSelect`, a `Combobox`, the dynamic credential inputs) — there's no
native form value to subscribe to. Wrap each one in `<Controller>` and read
the per-field error from `fieldState`.

```tsx
import { Controller } from 'react-hook-form'

<Controller
  name="cadenceId"
  control={control}
  render={({ field, fieldState }) => (
    <Field>
      <FieldLabel>Cadence</FieldLabel>
      <LookupSelect
        value={field.value ?? ''}
        onChange={field.onChange}
        placeholder="Select cadence"
        options={cadenceOptions}
        disabled={isPending}
      />
      {fieldState.error && (
        <FieldError id="cadenceId-error">{fieldState.error.message}</FieldError>
      )}
    </Field>
  )}
/>
```

For dynamic nested fields (e.g. `credentials.<key>` on the channel-account
form), RHF supports dotted paths: `<Controller name={`credentials.${key}`} ...>`.

### 3.c Derived `formSchema` recipe — UI-only rules

When the form needs a rule the contract does not carry — confirm-password
match, JSON-body parse, plugin-specific required credentials — declare a
derived schema **in the form file**, on top of the contract. The contract
package stays a pure mirror of the API DTO; UI concerns live next to the
form.

```tsx
const MIN_PASSWORD_LENGTH = 8

const formSchema = ConfirmPasswordResetSchema.extend({
  confirmPassword: z.string().min(MIN_PASSWORD_LENGTH),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: "Passwords don't match.",
    })
  }
})

type FormValues = z.infer<typeof formSchema>
```

Variations:
- **Subset (`.pick`)**: when the form only surfaces a subset of the
  contract's fields,
  `const formSchema = ContractSchema.pick({ email: true })` is the right
  derivation. Also necessary when the contract carries a `z.coerce.*` or
  `.default(...)` whose input/output types diverge — `useForm<z.infer<T>>`
  requires the same shape on both sides, and picking only the
  literal-typed fields the form uses keeps the resolver well-typed.
- **Path-param lift**: when an API path-param needs to live as a form field
  (e.g. `accountId` for grant-channel-access),
  `baseSchema.extend({ accountId: z.uuid() })`. The smart wrapper
  destructures `{ accountId, ...payload }` before calling the
  path-bound mutation.
- **Transform**: `.transform(({ rawJson, ...rest }) => ({ ...rest, parsed:
  parseJsonObject(rawJson)! }))` after `.superRefine` for inputs the user
  enters in one shape but the API expects in another.

Derived schemas carrying rules (`.superRefine`, `.transform`) are **fat
logic** per `TESTING.md`'s coverage matrix — author a focused web unit
spec on the schema (one rule per test) via the `generate-tests` skill.

### Smart-page wiring (parent owns side-effects)

The submit button lives **outside** the form via `form={id}`. The parent
declares side-effects on the mutation hook (`onSuccess`, `onError`) — no
`try/catch` in the form's submit handler. RHF's `handleSubmit` blocks the
callback when validation fails and prevents double-submit by default.

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
        <Button form={formId} type="submit" loading={isPending}>
          Save
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: '..' })}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
```

Dialog wrappers use `useMutationDialog` for the server-error string (see
§6); the wiring is otherwise identical.

Auth routes (`routes/auth/{login,signup,forgot-password,reset-password}.tsx`)
are the same shape — the route file is the smart page, the
`-components/<auth>-form.tsx` is the dumb form. No "auth is the exception"
clause.

Notes:

- Form-component file ≤50 lines (`react.md` §9). Past that, split into
  smaller field groupings under `-components/`.
- Validation comes from the contract via `zodResolver`. Native HTML
  validation (`required`, `type="email"`, `pattern`) is no longer used —
  the schema carries all the rules.
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
- **Per-feature folder, no naked container.** Every feature is its own
  folder under `routes/`; areas don't host feature-specific files in
  shared `-`-folders. Every URL-bearing folder either renders a page or
  redirects via `beforeLoad` — never a `route.tsx` with no `index.tsx`.
  (§1, §1.5)

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
   `index.tsx` + any of `new.tsx` / `$<entity>Id.tsx`. If the feature
   lives under an area that hosts other features, give it its own folder
   — never share area-level `-`-folders for feature-specific files
   (§1).
6. Create `-hooks/use-<feature>-search.ts` for URL-driven state (§4) if the
   feature has a filterable/paginated list.
7. Create `-utils/columns.tsx` for the `DataTable` column definitions.
8. Create `-components/<feature>-form.tsx` and any dumb child components.
   The form `useForm`s bound to the contract `*RequestSchema` via
   `zodResolver` (§3.a / §3.b / §3.c). Per-field `useState` is forbidden.
9. Add navigation entry under
   `apps/web/src/_shell/app-shell/data/` (the app shell's nav data lives
   in the shell, not in a `features/` tree).
