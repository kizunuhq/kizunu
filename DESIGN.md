# DESIGN.md

> Token-level reference for the kizunu design system. Read after
> `PRODUCT.md`. Every rule here is operational: copy the variables,
> use the class names, do not invent parallels.

The system is implemented as **Tailwind v4 `@theme inline` tokens
backed by CSS custom properties on `:root` and `.dark`**, plus a
small set of utility classes. `apps/web` consumes it; future
marketing pages reuse the same `globals.css`.

---

## 1. tokens

### 1.1 spine — OKLCH neutrals

The background is a **9-step ramp** (`--background` plus seven
`--background-N00` rungs and the inverse `--foreground`). The ramp is
tinted toward warm grey at near-zero chroma so it never looks
sterile.

```css
:root {
  --background:     oklch(99%  0 0);   /* page */
  --background-50:  oklch(98.5% 0 0);  /* faintest fill */
  --background-100: oklch(98%   0 0);
  --background-200: oklch(97%   0 0);
  --background-300: oklch(96%   0 0);  /* secondary button */
  --background-400: oklch(94%   0 0);  /* secondary hover */
  --background-500: oklch(92%   0 0);
  --background-600: oklch(91%   0 0);
  --background-700: oklch(86%   0 0);  /* strongest neutral fill */

  --foreground:     oklch(14.5% 0 0);
}

.dark {
  --background:     oklch(14.5% 0 0);
  --background-50:  oklch(15.5% 0 0);
  --background-100: oklch(16.5% 0 0);
  --background-200: oklch(18.5% 0 0);
  --background-300: oklch(20.5% 0 0);
  --background-400: oklch(23.5% 0 0);
  --background-500: oklch(27.5% 0 0);
  --background-600: oklch(29.5% 0 0);
  --background-700: oklch(34.5% 0 0);

  --foreground:     oklch(98.5% 0 0);
}
```

**Rules of use.**
- Pick a rung; never write `bg-white`, `bg-black`, `bg-zinc-*` or
  raw `#fff`/`#000`. Both bans are absolute.
- The ramp is **monotonic**: a higher number is a stronger surface
  in light mode and in dark mode (the actual lightness goes the
  other way in dark, but the semantic still rises).
- `bg-background` is the page. `bg-background-50` … `200` are quiet
  fills (table rows, popover bodies). `bg-background-300` is the
  default secondary surface (chips, badges, secondary buttons).
  `bg-background-700` is the loudest neutral; if you need louder,
  you have reached for the wrong tool.

### 1.2 semantic roles

```css
:root {
  --popover:               oklch(1     0 0);
  --popover-foreground:    oklch(14.5% 0 0);
  --primary:               oklch(20.5% 0 0);   /* near-black ink button */
  --primary-foreground:    oklch(98.5% 0 0);
  --secondary:             oklch(97%   0 0);
  --secondary-foreground:  oklch(20.5% 0 0);
  --muted:                 oklch(97%   0 0);
  --muted-foreground:      oklch(55.6% 0 0);   /* secondary copy */
  --accent:                oklch(97%   0 0);   /* hover fill */
  --accent-foreground:     oklch(20.5% 0 0);
  --destructive:           oklch(80%   0.22 31);
  --destructive-foreground:oklch(80%   0.22 31);
  --border:                oklch(92.2% 0 0);
  --input:                 oklch(92.2% 0 0);
  --ring:                  oklch(70.8% 0 0);
}
```

`--primary` is **ink, not a brand color**. The brand color lives in
the named accents (§1.4). Solid CTAs are ink. Brand-tinted hits
(kickers, status dots, charts) are accents.

### 1.3 radius

```css
:root { --radius: 2px; }
```

**Every** interactive surface and every panel uses `--radius` or the
literal `rounded-[2px]`. Two exceptions, both written down:

- `size-icon-small` buttons use `rounded-md` (badges fit better).
- Avatars are circular (and use the squircle detection block, §1.7).

No `rounded-lg`, no `rounded-2xl`, no `rounded-full` on rectangles.

### 1.4 named accents

Seven accent slots over the neutral spine. **Green is primary** —
it carries the brand and the success/replied/converted reading.
Yellow and pink carry warning and failure. Blue is metadata. Orange
is a deferred accent (used only in the ASCII aurora as a warmth
mixer; not surfaced as a UI hit).

```css
:root {
  --kizunu-green:        hsla(156, 86%, 40%, 1);  /* PRIMARY */
  --kizunu-pink:         hsla(314, 100%, 80%, 1);
  --kizunu-yellow:       hsla(58,  93%, 72%, 1);
  --kizunu-yellow-100:   hsla(45,  70%, 88%, 1);
  --kizunu-yellow-600:   hsla(40,  90%, 28%, 1);
  --kizunu-blue:         hsla(218, 92%, 72%, 1);
  --kizunu-orange:       hsla(19,  99%, 44%, 1);
}

.dark {
  --kizunu-green:        hsla(156, 86%, 64%, 1);
  --kizunu-pink:         hsla(314, 100%, 85%, 1);
  --kizunu-yellow:       hsla(58,  92%, 79%, 1);
  --kizunu-yellow-100:   hsla(58,  70%, 20%, 1);
  --kizunu-yellow-600:   hsla(58,  92%, 79%, 1);
  --kizunu-blue:         hsla(218, 91%, 78%, 1);
  --kizunu-orange:       hsla(19,  99%, 50%, 1);
}
```

**Use of accent.** Restated from `PRODUCT.md` because this is the
single rule most likely to break: accent appears in **three places,
never four** — mono kicker, status dot, ASCII aurora tint. A button
filled with `bg-kizunu-green` is wrong. A border in `border-kizunu-blue`
is wrong. If you want emphasis, use weight, size, or the ink
`--primary`.

**Status mapping** (mandatory, no per-feature variation):

| state    | dot color          | label color          |
|----------|--------------------|----------------------|
| sent     | `muted-foreground` | `muted-foreground`   |
| delivered| `muted-foreground` | `foreground`         |
| read     | `kizunu-blue`      | `foreground`         |
| replied  | `kizunu-green`     | `foreground`         |
| stopped  | `kizunu-yellow-600`| `foreground`         |
| failed   | `kizunu-pink`      | `foreground`         |
| opt-out  | `kizunu-yellow-600`| `muted-foreground`   |

### 1.5 sidebar tokens

Used by the dashboard chrome. Kept in HSL because the consuming
sidebar primitive expects HSL today; rewrite to OKLCH only if the
primitive switches.

```css
:root {
  --sidebar:                       hsl(0 0% 98%);
  --sidebar-foreground:            hsl(240 5.3% 26.1%);
  --sidebar-primary:               hsl(240 5.9% 10%);
  --sidebar-primary-foreground:    hsl(0 0% 98%);
  --sidebar-accent:                hsl(240 4.8% 95.9%);
  --sidebar-accent-foreground:     hsl(240 5.9% 10%);
  --sidebar-border:                hsl(220 13% 91%);
  --sidebar-ring:                  hsl(217.2 91.2% 59.8%);
}

.dark {
  --sidebar:                       hsl(240 5.9% 10%);
  --sidebar-foreground:            hsl(240 4.8% 95.9%);
  --sidebar-primary:               hsl(224.3 76.3% 48%);
  --sidebar-primary-foreground:    hsl(0 0% 100%);
  --sidebar-accent:                hsl(240 3.7% 15.9%);
  --sidebar-accent-foreground:     hsl(240 4.8% 95.9%);
  --sidebar-border:                hsl(240 3.7% 15.9%);
  --sidebar-ring:                  hsl(217.2 91.2% 59.8%);
}
```

### 1.6 code surfaces

For `<pre>`, syntax-highlighted blocks, the in-product config viewer:

```css
:root {
  --code:               var(--surface);
  --code-foreground:    var(--surface-foreground);
  --code-highlight:     oklch(0.96 0 0);
  --code-number:        oklch(0.56 0 0);
  --selection:          oklch(0.145 0 0);
  --selection-foreground: oklch(1 0 0);
}

.dark {
  --surface:            oklch(0.2  0 0);
  --surface-foreground: oklch(0.708 0 0);
  --code-highlight:     oklch(0.27 0 0);
  --code-number:        oklch(0.72 0 0);
  --selection:          oklch(0.922 0 0);
  --selection-foreground: oklch(0.205 0 0);
}
```

### 1.7 squircle support

Avatars and the logo mark take a doubled corner radius on browsers
that implement `corner-shape: squircle`. This is a progressive
enhancement, never load-bearing.

```css
:root { --avatar-border-radius-multiplier: 1; }

@supports (corner-shape: squircle) {
  :root { --avatar-border-radius-multiplier: 2; }
}
```

### 1.8 layout dimensions

```css
:root {
  --header-height: 80px;
  --footer-height: 0px;
}
```

The footer is a `min-h-100` block on the marketing surface and absent
on the dashboard; the variable exists so dashboard layouts can do
`min-h-[calc(100svh-var(--header-height))]` without a magic number.

---

## 2. typography

Three families, in order of frequency. The web app is Vite, not
Next.js — fonts are pulled via `@fontsource-variable/*` npm packages
and imported from inside `styles.css`, **not** from `main.tsx`:

```css
/* apps/web/src/styles.css */
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';
@import '@fontsource-variable/unbounded';

@theme inline {
  --font-sans:    'Geist Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono:    'Geist Mono Variable', ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
  --font-display: 'Unbounded Variable', 'Geist Variable', ui-sans-serif, sans-serif;
  --font-heading: var(--font-display);
}

body { font-synthesis-weight: none; text-rendering: optimizeLegibility; }
```

**Usage.**
- **`font-sans` (Geist Variable)** — every default UI string. Body,
  controls, table cells, dialog copy.
- **`font-mono` (Geist Mono Variable)** — every piece of metadata,
  every timestamp, every channel name, every count, every key. Also
  the bracketed kicker labels and the footer (the entire footer is
  mono; do not break that).
- **`font-display` (Unbounded Variable)** — marketing only. Reserved
  for the landing hero and the section-opening headlines on the
  marketing surface. Never in the dashboard. The Geist fallback in
  the family stack means a brief FOUT on first paint degrades to
  Geist at the same weight, not to a system serif.

**Swap point.** Unbounded is the free-licensed slot. If the project
later licenses a commercial display face (F37 Stout, Migra, Sentient,
Tobias), the swap is one line: change `--font-display` to the new
family, drop the new `@fontsource` import or `@font-face` block, ship.
Nothing downstream needs to know.

**Scale.** No global type ramp — Tailwind utilities only, chosen
per-context. Defaults that recur:

| use                              | class                                        |
|----------------------------------|----------------------------------------------|
| dashboard body                   | `text-sm` (14px)                             |
| metadata, kicker, timestamp      | `text-xs font-mono`                          |
| table heading                    | `text-xs font-mono uppercase tracking-wide`  |
| section heading (in-app)         | `text-base font-medium`                      |
| page heading (in-app)            | `text-lg font-medium`                        |
| section heading (marketing)      | `font-f37-stout text-3xl md:text-4xl`        |
| display headline (marketing)     | `font-display text-[42px] md:text-3xl xl:text-5xl leading-tight text-balance` |

Display headlines are always `text-balance` and always **sentence
case**.

---

## 3. layout

Two structural classes — both are kizunu utilities, declared in
`globals.css` under `@layer utilities`:

```css
.container-wrapper {
  @apply max-w-[1400px] min-[1800px]:max-w-screen-2xl mx-auto w-full
         border-x border-dashed;
}

.container {
  @apply px-4 mx-auto max-w-screen-2xl;
}
```

`container-wrapper` is the **outer frame** for every full-bleed
marketing section: it caps width, centers, and gives the page its
signature vertical dashed gutters. `container` is the inner gutter
inside it. Nest as `container-wrapper > container > content`.

### 3.1 the dashed full-width border

The single most identifiable structural device. It is not a card
border, not a section background — it is a 1px dashed horizontal
rule that escapes the container and crosses the entire viewport,
used to separate sections without wrapping them.

```tsx
// components/primitives/full-width-border.tsx
export function FullWidthBorder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        '-translate-x-1/2 pointer-events-none absolute left-1/2 z-1 h-px w-screen border-t border-dashed',
        className,
      )}
    />
  )
}
```

Use it like this:

```tsx
<section className="relative">
  <FullWidthBorder className="top-0" />
  {/* section content */}
  <FullWidthBorder className="bottom-0" />
</section>
```

A section that has a real card or panel inside still uses these
above and below the **section**, not around the panel.

### 3.2 the topbar

Fixed, 80px tall (matches `--header-height`), bottom border is a
`FullWidthBorder`, never a solid divider. Pattern:

```tsx
<div className="fixed top-0 right-0 left-0 z-50">
  <div className="fixed top-0 right-0 left-0 h-16 min-h-16 w-screen border-background border-b bg-background" />
  <div className="container-wrapper relative mx-auto bg-background">
    <div className="container z-50 mx-auto flex items-center bg-background py-4 lg:justify-between">
      {/* logo, nav, controls */}
      <FullWidthBorder className="bottom-0" />
    </div>
  </div>
</div>
```

---

## 4. components

### 4.1 button

Single source of truth, copied into `apps/web/src/components/primitives/button.tsx`.
Variants: `default | destructive | outline | secondary | ghost | link`.
Sizes: `default | sm | xs | lg | icon | icon-small`.

```ts
const buttonVariants = cva(
  "group/btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border border-transparent font-medium text-sm outline-none transition-all hover:cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-primary/60 [&_svg]:group-hover/btn:text-primary",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary/90 [&_svg]:text-primary-foreground/60 [&_svg]:group-hover/btn:text-primary-foreground",
        destructive: "border-destructive/80 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive/90 hover:text-white focus-visible:ring-destructive/20 dark:border-destructive/30 dark:bg-destructive/10 dark:focus-visible:ring-destructive/40 dark:hover:bg-destructive/50",
        outline:     "border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:   "bg-background-300 text-secondary-foreground hover:bg-background-400",
        ghost:       "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:      "h-9 px-4 py-2 has-[>svg]:px-3",
        sm:           "h-8 gap-1.5 px-3 has-[>svg]:px-2",
        xs:           "h-7 gap-1.5 px-2.5 text-xs has-[>svg]:px-1.5",
        lg:           "h-10 px-8 has-[>svg]:gap-3 has-[>svg]:px-10",
        icon:         "size-9",
        'icon-small': "size-6 rounded-md",
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
```

Two non-obvious moves to preserve:

1. **Icon recoloring on hover.** `[&_svg]:text-primary/60` then
   `[&_svg]:group-hover/btn:text-primary` — icons sit at 60% opacity
   until the row is hovered, then snap to full. Do not remove.
2. **`bg-background-300` for `secondary`.** Secondary buttons use a
   neutral rung, not the `--secondary` semantic role. This is
   deliberate; it keeps a row of [primary][secondary][ghost] buttons
   visually graded without any color.

**CTA pattern for landing hero** (matched verbatim):

```tsx
<Button asChild className="h-12 border border-transparent font-medium text-md has-[>svg]:px-4 lg:w-[250px]">
  <Link href="/sign-up">Install kizunu now</Link>
</Button>
<Button asChild className="h-12 justify-between px-4 font-medium text-md" variant="ghost">
  <Link href="/docs">Explore the docs</Link>
</Button>
```

### 4.2 the mono kicker

The single most-used micro-component. Lives inline:

```tsx
<p className="font-medium font-mono text-kizunu-green text-xs">
  [Cadence engine that respects reply-stop in milliseconds]
</p>
```

Rules:
- Always `font-mono`, always `text-xs`, always `font-medium`, always
  the primary accent (`text-kizunu-green`).
- Always **wrapped in square brackets** as part of the string. The
  brackets are not borders or pseudo-elements; they are characters.
- Sentence case inside the brackets. No trailing punctuation.
- One kicker per section, placed immediately above the section
  headline.

### 4.3 the numbered step `[01]`

For ordered flows (the "how it works" section, the empty-state
walkthrough, the changelog entry):

```tsx
<button className="group flex items-start gap-3 text-left">
  <span className="font-mono text-muted-foreground text-xs">[01]</span>
  <span className="flex flex-col gap-1">
    <span className="font-medium text-sm">Customer enters cadence</span>
    <span className="text-muted-foreground text-sm">Pipedrive stage drops the contact into the queue.</span>
  </span>
</button>
```

Numbers are **always two-digit, zero-padded, square-bracketed,
mono**. Never `1.`, never `①`, never a chip. The number is the
ornament.

### 4.4 the browser frame

Marketing hero embeds a fake browser chrome around the dashboard
screenshot / demo. Reuse the `BrowserWithBackground` component
pattern: a 1px-bordered, 2px-rounded box with a small URL bar at
the top, and an `<ASCIIAurora />` background bleeding behind it.
Bracket it top and bottom with `FullWidthBorder`.

```tsx
<div className="relative hidden w-full lg:block">
  <FullWidthBorder className="top-0" />
  <BrowserWithBackground containerClassName="w-full">
    <FakeDashboard />
  </BrowserWithBackground>
  <FullWidthBorder className="bottom-0" />
</div>
```

### 4.5 footer

Lowercase. Mono everywhere. Four-column grid on desktop, single
column on mobile. The brand paragraph is the positioning sentence
from `PRODUCT.md`, verbatim, in `font-mono text-foreground/60 text-sm`.

Below the column block: a **dashed top border**, then a 400px-tall
canvas region with the `Background` aurora at `fieldOpacity={0.06}`,
the kizunu wordmark cut into the negative space at the bottom
(white-on-aurora silhouette), the © line and legal links in mono at
the top of the canvas region.

The complete pattern lives in
`apps/web/src/app/(marketing)/components/footer.tsx`.

### 4.6 ASCII aurora background

The signature decorative component. A pointer-reactive canvas that
samples a vector field and renders it as ASCII glyphs in the
foreground color, tinted with the primary accent. **Always
non-interactive content** (`aria-hidden`, `pointer-events-none` on
the layers), always behind real content, always optional (the
component degrades gracefully on `prefers-reduced-motion`).

Props that matter when placing it:

```tsx
<Background
  accentColorVar="--kizunu-green"  // primary; override for committed sections
  fieldOpacity={0.06}              // 0.06 footer / 0.16 hero is the spread
  interactive={true}
  pointerTrail={true}
  pointerTrailRadius={0.2}
  className="absolute inset-0 z-0"
/>
```

Rules:
- Never on top of body copy. Only behind heroes, behind the footer,
  behind the empty-state of a chart, behind the auth pages.
- Never two on one page.
- The accent variable choice is **the** committed-section device:
  the hero uses `--kizunu-green`, a `failed` deep-dive page can use
  `--kizunu-pink`, a `read` analytics page can use `--kizunu-blue`.
  One accent per page.

---

## 5. motion

```css
html { @apply scroll-smooth; }
```

- Animate `opacity`, `transform`, `filter`. Never `width`, `height`,
  `top/left/right/bottom`, `margin`, `padding`. The ban is absolute.
- Default duration: 150ms for state changes, 250ms for entering
  panels, 600ms for the ASCII aurora field warp (handled inside the
  canvas, do not touch from outside).
- Easing: ease-out-quart or ease-out-quint. No bounce. No elastic.
  No spring physics in UI motion.
- The three-dot typing animation
  (`.dot-bounce-1 / -2 / -3`) is the **only** sanctioned bouncing
  motion in the system, scoped to the chat-like message
  acknowledgement pattern.

```css
@keyframes bounce-dot {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}
.dot-bounce-1 { animation: bounce-dot 1.4s infinite; animation-delay: 0s; }
.dot-bounce-2 { animation: bounce-dot 1.4s infinite; animation-delay: .16s; }
.dot-bounce-3 { animation: bounce-dot 1.4s infinite; animation-delay: .32s; }
```

---

## 6. themes

Light is the default. Dark exists; `next-themes` flips a `.dark`
class on `<html>`. Vite shell — no `next/font` variables to wire —
fonts come in via `styles.css` (§2), so `index.html` and `main.tsx`
stay minimal:

```html
<!-- apps/web/index.html -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kizunu</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" async src="/src/main.tsx"></script>
  </body>
</html>
```

Dialogs, popovers and tooltips render into a dedicated portal root
appended at the top of `#app` (or `<body>`) so they inherit the
theme class and the z-index ordering. Mount it once in the app
shell, not per-route.

**Choosing per surface.** The dashboard defaults to **light** (sales
operator at 10am, not an SRE at 2am). The marketing site honors
system preference. Auth pages default to dark only because the
ASCII aurora at high `fieldOpacity` reads more cinematic there;
that is the only forced theme in the product.

---

## 7. anti-patterns (kizunu-specific)

In addition to the absolute bans in the shared design laws:

- **No solid 1px borders between sections.** Use the dashed
  full-width rule. A solid `border-t` is for inside-card affordances.
- **No status pills with backgrounds.** A status is a dot plus a
  label. No `bg-green-100 text-green-700 rounded-full px-2`. Ever.
- **No drop shadows on panels.** Sharp corners, dashed borders,
  flat. The single allowed elevation is `shadow-xs` on the search /
  command palette popover.
- **No card-of-cards.** A card may contain rows, fields, or a list;
  it may not contain another card. Nested cards are always wrong.
- **No icon-only navigation in the dashboard sidebar.** Every nav
  item is text first; icons assist. We are not Linear-clone.
- **No "Get a demo" / "Talk to sales" CTA pattern.** The first CTA
  is always the install command or the sign-up link.
- **No skeletons with shimmer.** Use the static `Skeleton`
  primitive (a `bg-background-200` block); shimmer reads as a
  spinner-substitute and is dishonest about progress.

---

## 8. where things live in the codebase

| concern                     | path                                                |
|-----------------------------|-----------------------------------------------------|
| token + theme CSS           | `apps/web/src/styles.css`                           |
| font imports                | `apps/web/src/styles.css` (top of file)             |
| html shell                  | `apps/web/index.html`                               |
| boot                        | `apps/web/src/main.tsx`                             |
| primitives (shadcn)         | `apps/web/src/components/primitives/`               |
| `Button`, `Input`, …        | `apps/web/src/components/primitives/<name>.tsx`     |
| `FullWidthBorder`           | `apps/web/src/components/primitives/full-width-border.tsx` |
| `Background` (ASCII aurora) | `apps/web/src/components/primitives/background.tsx` (+ `.shared.ts`) |
| marketing sections          | `apps/web/src/features/marketing/`                  |
| dashboard chrome            | `apps/web/src/features/app-shell/`                  |
| feature slices              | `apps/web/src/features/<cadence\|channel\|crm\|engine\|identity\|workspace>/` |

When you add a new primitive go through the `shadcn` skill first
(see `.agents/rules/react.md` §0). The shadcn config
(`apps/web/components.json`) is already wired: `style: base-nova`,
`baseColor: neutral`, `iconLibrary: @phosphor-icons/react`,
`ui: @kizunu/web/components/primitives`. Verify generated files:
imports resolve to `@kizunu/web/*`, the `cn` helper points at
`@kizunu/web/lib/utils`, icons use `@phosphor-icons/react`, never
`lucide-react`.

---

## 9. the live `styles.css`

The token sheet **is shipped** as `apps/web/src/styles.css`. It is
the single source of truth — do not invent parallel tokens
elsewhere in the tree. Order of imports matters:

1. `tailwindcss` — engine.
2. `tw-animate-css` — animation utilities.
3. `shadcn/tailwind.css` — primitive token defaults; kizunu
   overrides them in `:root` / `.dark` below.
4. `@fontsource-variable/{geist,geist-mono,unbounded}` — fonts.

Then the structure is:

- `:root { … }` — light-mode tokens, in this order: named accents,
  background elevation spine (commented ramp), layout dimensions,
  semantic shadcn roles, sidebar (HSL), code surfaces, squircle
  detection.
- `.dark { … }` — same shape, dark values.
- `@theme inline { … }` — exposes everything to Tailwind: fonts,
  elevation spine, semantic roles, named accents, sidebar, code,
  derived radii.
- `@layer base { … }` — `* { @apply border-border outline-ring/50 }`,
  `html { scroll-smooth font-sans antialiased }`,
  `body { bg-background text-foreground }`, `::selection`.
- `@layer utilities { … }` — `.container-wrapper`, `.container`,
  `.no-scrollbar`, `bounce-dot` keyframes + `.dot-bounce-{1,2,3}`.
- `@media (prefers-reduced-motion: reduce) { … }` — global motion
  reset (animation 0.01ms, transition 0.01ms, `scroll-behavior: auto`).

The full file is at `apps/web/src/styles.css`. If the diff against
this section drifts, fix the file, not this section.

---

## 10. the slop test

The page passes if a stranger cannot guess the category from a
screenshot. If they can say "this is a sales-engagement tool"
without seeing the word, the design has fallen into the saturated
lane (electric-blue gradients, purple pipeline cards, stacked metric
heroes). Rework the kicker, the color strategy, and the layout
until the only readable signal is **"this is a tool, and it is
serious about the work."**
