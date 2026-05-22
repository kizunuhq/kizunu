# React Standards

These rules apply to React code in `apps/web`.

## 0. Source UI Primitives From shadcn/ui First (foundational)

Every primitive UI building block in `apps/web` — buttons, inputs, labels, fields,
cards, separators, dialogs, toasts, tables, and the like — **originates from
shadcn/ui**, installed as source into `src/components/primitives/` (the `ui` alias in
`apps/web/components.json`). Customize the installed source in-project; do not
hand-roll a styled `div`/`span`/`button` when a shadcn primitive exists for it.

Write a bespoke component **only** when no shadcn primitive (in `@shadcn` or a
community registry) fits the need — and even then, compose it from installed
primitives where possible.

**Always go through the `shadcn` skill** for this work. Before adding, fixing, or
composing UI: get project context (`shadcn info`), search registries
(`shadcn search`), read component docs (`shadcn docs <component>`), then install
(`shadcn add <component>`). Use the project's runner (`bunx --bun shadcn@latest`).
After install, verify the generated files: imports resolve to `@kizunu/web/*`, the
`cn` helper points at `@kizunu/web/lib/utils`, and icons use `@phosphor-icons/react`
(the project's `iconLibrary`) — never `lucide-react`.

Compose, don't reinvent: prefer built-in variants (`variant="outline"`, `size="sm"`)
and semantic tokens (`bg-primary`, `text-muted-foreground`) over custom styling. See
the `shadcn` skill's rules for the full styling/composition contract.

Bad:

```tsx
// Hand-rolled primitive — bypasses shadcn entirely.
function SaveButton() {
  return (
    <button className="rounded-md bg-blue-600 px-3 py-2 text-white">Save</button>
  )
}
```

Good:

```tsx
// Installed from shadcn into components/primitives, used via its variants.
import { Button } from '@kizunu/web/components/primitives/button'

function SaveButton() {
  return <Button>Save</Button>
}
```

## 1. Use Functional Components

Write React components as functions. Do not create new class components.

Bad:

```tsx
class UserCard extends React.Component {
  render() {
    return <article>{this.props.name}</article>;
  }
}
```

Good:

```tsx
interface UserCardProps {
  name: string;
}

function UserCard({ name }: UserCardProps) {
  return <article>{name}</article>;
}
```

## 2. Use TypeScript And .tsx Files

React components must be written in TypeScript and saved as `.tsx` files.

Bad:

```jsx
export function StatusBadge(props) {
  return <span>{props.status}</span>;
}
```

Good:

```tsx
interface StatusBadgeProps {
  status: "active" | "inactive";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span>{status}</span>;
}
```

## 3. Keep Component State Close To Where It Is Used

Declare state in the smallest component that needs to read or update it. Lift state only when multiple components need to share it.

Bad:

```tsx
function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />;
}
```

Good:

```tsx
function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return <button onClick={() => setIsMenuOpen(!isMenuOpen)}>Menu</button>;
}
```

## 4. Pass Props Explicitly

Define prop types and pass only the props a component needs. Avoid spreading arbitrary objects into components.

Bad:

```tsx
function UserRow({ user }: { user: User }) {
  return <UserAvatar {...user} />;
}
```

Good:

```tsx
function UserRow({ user }: { user: User }) {
  return <UserAvatar name={user.name} imageUrl={user.imageUrl} />;
}
```

## 5. Avoid Large Components

Keep components focused on one responsibility. Extract child components, hooks, or utility functions when rendering, state, or behavior becomes hard to scan.

Bad:

```tsx
function OrdersView() {
  return (
    <main>
      <header>{/* filters, totals, and actions */}</header>
      <section>{/* table, empty state, pagination, and dialogs */}</section>
    </main>
  );
}
```

Good:

```tsx
function OrdersView() {
  return (
    <main>
      <OrdersToolbar />
      <OrdersTable />
      <OrdersPagination />
    </main>
  );
}
```

## 6. Use Tailwind For Styling

Use Tailwind utility classes for component styling. Avoid inline styles and component-specific CSS unless Tailwind cannot express the requirement clearly.

Bad:

```tsx
function SaveButton() {
  return <button style={{ padding: 12, backgroundColor: "#2563eb" }}>Save</button>;
}
```

Good:

```tsx
function SaveButton() {
  return <button className="rounded-md bg-blue-600 px-3 py-2 text-white">Save</button>;
}
```

## 7. Use useMemo For Expensive Computation

Use `useMemo` when a component performs expensive derived calculations during render. Do not use it for trivial expressions.

Bad:

```tsx
function InvoiceSummary({ items }: InvoiceSummaryProps) {
  const total = calculateLargeInvoiceTotal(items);

  return <span>{total}</span>;
}
```

Good:

```tsx
function InvoiceSummary({ items }: InvoiceSummaryProps) {
  const total = useMemo(() => calculateLargeInvoiceTotal(items), [items]);

  return <span>{total}</span>;
}
```

## 8. Prefix Custom Hooks With use

Custom hooks must start with `use` and must encapsulate reusable stateful logic.

Bad:

```tsx
function currentUser() {
  return useContext(UserContext);
}
```

Good:

```tsx
function useCurrentUser() {
  return useContext(UserContext);
}
```

## 9. Component size

Avoid components with more than 50 lines of code
