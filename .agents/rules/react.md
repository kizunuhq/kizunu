# React Standards

These rules apply to React code in `frontend/`.

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
