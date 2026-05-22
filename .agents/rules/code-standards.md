# Code Standards

These rules apply to all project code.

## 1. Write All Code In English

Use English for identifiers, comments, error messages, and documentation in source files.

Bad:

```ts
const usuarioAtivo = true;
function calcularTotal() {
  return 10;
}
```

Good:

```ts
const activeUser = true;
function calculateTotal() {
  return 10;
}
```

## 2. Use camelCase For Variables, Methods, And Functions

Variables, methods, and functions must start with a lowercase letter and use camelCase.

Bad:

```ts
const User_Name = "Ada";
function Get_Total() {
  return 10;
}
```

Good:

```ts
const userName = "Ada";
function getTotal() {
  return 10;
}
```

## 3. Use PascalCase For Classes And Interfaces

Classes and interfaces must start with an uppercase letter and use PascalCase.

Bad:

```ts
interface userProfile {
  name: string;
}

class order_service {}
```

Good:

```ts
interface UserProfile {
  name: string;
}

class OrderService {}
```

## 4. Avoid Magic Numbers

Do not place unexplained numeric values directly in logic. Extract them into named constants.

Bad:

```ts
if (items.length > 50) {
  throw new Error("Too many items");
}
```

Good:

```ts
const maxItemsPerOrder = 50;

if (items.length > maxItemsPerOrder) {
  throw new Error("Too many items");
}
```

## 5. Avoid More Than Two Nested if/else Statements

Keep conditionals shallow. Use guard clauses, extracted functions, or clear data structures to reduce nesting.

Bad:

```ts
function processPayment(order: Order) {
  if (order.isValid) {
    if (order.customer.isActive) {
      if (order.total > 0) {
        return chargeOrder(order);
      }
    }
  }
}
```

Good:

```ts
function processPayment(order: Order) {
  if (!order.isValid) return;
  if (!order.customer.isActive) return;
  if (order.total <= 0) return;

  return chargeOrder(order);
}
```

## 6. Avoid Passing More Than Three Parameters

Functions and methods should receive at most three parameters. Use an object parameter when more data is required.

Bad:

```ts
function createUser(name: string, email: string, role: string, isActive: boolean) {
  return { name, email, role, isActive };
}
```

Good:

```ts
interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

function createUser(input: CreateUserInput) {
  return input;
}
```

## 7. Avoid switch/case

Prefer maps, strategy objects, polymorphism, or simple if statements over `switch/case`.

Bad:

```ts
function getStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    default:
      return "Unknown";
  }
}
```

Good:

```ts
const statusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
};

function getStatusLabel(status: string) {
  return statusLabels[status] ?? "Unknown";
}
```

## 8. Start Methods And Functions With A Verb

Function and method names must describe an action and start with a verb.

Bad:

```ts
function userTotal(user: User) {
  return user.orders.length;
}
```

Good:

```ts
function calculateUserTotal(user: User) {
  return user.orders.length;
}
```

## 9. Do Not Use var

Use `const` by default and `let` only when reassignment is required.

Bad:

```ts
var total = 0;
total = total + 10;
```

Good:

```ts
let total = 0;
total = total + 10;

const taxRate = 0.1;
```

## 10. Keep Methods And Functions Below 30 Lines

Functions and methods must stay below 30 lines of code. Extract smaller functions when logic grows.

Bad:

```ts
function createInvoice(order: Order) {
  validateOrder(order);
  calculateSubtotal(order);
  calculateDiscount(order);
  calculateTaxes(order);
  calculateShipping(order);
  reserveInventory(order);
  updateCustomerHistory(order);
  notifyWarehouse(order);
  notifyCustomer(order);
  persistInvoice(order);
  sendInvoiceEmail(order);
  updateAnalytics(order);
}
```

Good:

```ts
function createInvoice(order: Order) {
  validateOrder(order);
  const totals = calculateInvoiceTotals(order);
  reserveInventory(order);
  notifyInvoiceCreated(order);

  return persistInvoice(order, totals);
}
```
## 11. Split types in different files

Do not create different types in the same file, always split them in different files
