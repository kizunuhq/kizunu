# Base UI Primitives

These rules apply to `apps/web/` primitives that wrap Base UI
(`@base-ui/react/*`). The shadcn `base-nova` preset (configured in
`apps/web/components.json`) installs Base UI primitives into
`apps/web/src/components/primitives/`; everything in this file is about
idioms specific to that library — not React in general
(see `react.md`) and not our layering recipe (see `web-patterns.md`).

This rule is **not** script-gated; review enforces it. Canonical
external reference: <https://base-ui.com/llms.txt> (the maintained
index of Base UI component docs).

## 1. `Select.Value` Renders The Raw Value By Default

Base UI's `Select.Value`, **unlike Radix**, does not automatically
reflect the selected `Select.Item`'s child text in the trigger. When
neither a `children` render function nor an `items` prop on
`Select.Root` is provided, `Select.Value` renders the **raw selected
value** — which in our code is almost always a UUID or a stable id
(plugin id, preset key). The dropdown lists the labels correctly; only
the trigger is broken.

Bad — trigger shows the raw value:

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select cadence" />
  </SelectTrigger>
  <SelectContent>
    {options.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Good — render-children function resolves the label, with a
placeholder fallback for empty **and stale** values:

```tsx
function resolveLabel(v: string, opts: Array<{ value: string; label: string }>, placeholder: string) {
  if (!v) return placeholder
  return opts.find((o) => o.value === v)?.label ?? placeholder
}

<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue>{(v: string) => resolveLabel(v, options, 'Select cadence')}</SelectValue>
  </SelectTrigger>
  <SelectContent>
    {options.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Alternative — pass `items` to `Select.Root` and let Base UI render
both the label and the items:

```tsx
const items = options.map(({ value, label }) => ({ value, label }))

<Select items={items} value={value} onValueChange={onChange}>
  <SelectTrigger><SelectValue placeholder="Select cadence" /></SelectTrigger>
  <SelectContent />
</Select>
```

**Why the placeholder for stale values:** if the underlying entity is
deleted (a cadence template, a connector, a plugin) the form may still
carry its id. Showing the raw id leaks an implementation detail;
showing the placeholder is the same fallback as "nothing selected
yet" and matches the muted styling already wired by
`data-placeholder:text-muted-foreground` on the trigger.

**When to use which:** prefer the render-children function when the
consumer renders `SelectItem`s explicitly (our `LookupSelect`,
`PluginSelect` and most call sites). Prefer the `items` prop when the
consumer would rather have Base UI render the items too — useful for
new primitives that take a plain `{ label, value }[]` and never need
to customize item markup.

## 2. The `render={...}` Render-Prop Pattern

Most Base UI primitives expose a `render` prop that replaces the
internal element while preserving the primitive's behavior (data
attributes, refs, ARIA wiring). It is the Base UI replacement for
Radix's `asChild`. Reach for it whenever you would otherwise wrap a
primitive in a styled `<span>` / `<div>` and lose the primitive's
data-state hooks.

Good — the trigger's caret icon is the primitive's own element,
styled via `render`:

```tsx
<SelectPrimitive.Icon
  render={<CaretDown className="text-muted-foreground pointer-events-none size-4" />}
/>
```

Good — the item indicator's positioning wrapper is the rendered
element; the check icon stays as the indicator's child:

```tsx
<SelectPrimitive.ItemIndicator
  render={
    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
  }
>
  <Check className="pointer-events-none" />
</SelectPrimitive.ItemIndicator>
```

Bad — wrapping the primitive in a styled element drops the
primitive's behavior:

```tsx
<span className="...">
  <SelectPrimitive.Icon />
</span>
```

The `render` prop also accepts a function `(props, state) => ReactNode`
for cases where the rendered element needs to read the primitive's
state. Use the JSX-element form when you only care about styling; reach
for the function form when state-driven rendering is unavoidable.

## 3. Form Integration

Our primitives composition already wires `aria-invalid` and
`aria-describedby` by hand in
`apps/web/src/components/primitives/field.tsx`, and forms bind to
schemas via `react-hook-form` + `zodResolver` per `web-patterns.md` §
3. Base UI also ships its own `@base-ui/react/field` primitive that
provides those wirings automatically. We currently do not use it. If
a new primitive needs richer field behavior (e.g. validity state
driven by the browser's constraint validation), consider Base UI's
Field rather than re-implementing the wiring in our composed layer.
Until then, follow `web-patterns.md` § 3 unchanged.

## 4. When This Rule Doesn't Cover It — `base-ui.com/llms.txt`

Base UI is large and evolving. When introducing a primitive we don't
already wrap — `Combobox`, `NumberField`, `Slider`, etc. — go to
<https://base-ui.com/llms.txt> first. It is the maintained index;
each component's page has the prop tables, the controlled vs.
uncontrolled patterns, and the data-attribute names you'll need to
target with Tailwind. Skim that page **before** trying to infer the
API from Radix-shaped intuition: Base UI overlaps with Radix on
some primitives and diverges on others (Select's Value is the
canonical example).

After the page, prefer to wrap the primitive in
`components/primitives/<name>.tsx` via the shadcn skill
(`shadcn search` / `shadcn add` / `shadcn docs`) so the result picks
up our preset's tokens, typography, and motion automatically.

## 5. Related

- **`react.md`** § 0 — shadcn-first primitives; the contract that
  every primitive in `apps/web` is installed via shadcn (which, on
  our preset, wraps Base UI).
- **`web-patterns.md`** § 3 (Forms) — `react-hook-form` +
  `zodResolver` wiring; our composed `Field` primitive carries the
  aria triad by hand.
- **`shadcn` skill** — the way you install, search, and read docs for
  shadcn registries (including our `base-nova` preset).
