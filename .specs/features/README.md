# Feature specs

Each feature gets its own directory here, holding its `spec.md` (and, when scope
warrants, `context.md` / `design.md` / `tasks.md`) per the `tlc-spec-driven` flow.

## Rule: sequential numbering — never skip

Feature directories **must** be prefixed with a zero-padded, strictly sequential
number followed by a kebab-case slug:

```
NNN-<kebab-slug>/   e.g. 001-shadcn-first-primitives/
```

- Numbering starts at `001` and increments by exactly one for every new feature:
  `001` → `002` → `003` → `004` … **Never skip a number and never reuse one.**
- The next number is `(highest existing NNN) + 1`. Before creating a feature, list
  this directory and take the max prefix + 1.
- The slug is a short, descriptive kebab-case name; it may be renamed later, but the
  number is immutable once assigned (it is a stable reference, like an ADR id).
- If a feature is abandoned, leave its number retired — do not renumber later
  features to fill the gap, and do not hand the number to a different feature.

This keeps the order features were planned in legible at a glance and gives every
spec a stable, citable id.
