# Channel Credential Fields — Design

Traces `spec.md`. Follows the type-safe boundary order from `AGENTS.md`: contract →
API → client → web. The descriptor is a **render hint**; the zod `configSchema` stays
the validation authority (D2 — Meta specifics never reach the engine).

## Where the descriptor lives (and the boundary-duplication precedent)

A credential field is `{ key, label, type: 'text' | 'secret', required }`. It crosses
the type-safe boundary, so — exactly like the existing `ChannelCapability` /
`z.enum(['freeform','template','media'])` pair — it is expressed twice, once per side,
each side owning its representation:

- **Backend (domain port):** a TypeScript shape under `core/plugin/`.
- **Contract (wire shape):** a zod schema in `@kizunu/api-contracts/channel`, from
  which the typed client and web app derive their types for free.

The `configSchema` (e.g. `metaCredentialsSchema`) is **not** serialized over the wire;
the descriptor is the serialized, declarative projection of it. A unit guard
(CRED-09) keeps the two in lockstep so the duplication can't rot.

## Components

### 1. Backend port (`apps/api/src/modules/channel/core/plugin/`)

- **`channel-credential-field-type.ts`** — `export type ChannelCredentialFieldType = 'text' | 'secret'`.
- **`channel-credential-field.ts`** — the interface:
  ```ts
  export interface ChannelCredentialField {
    key: string
    label: string
    type: ChannelCredentialFieldType
    required: boolean
  }
  ```
- **`channel-plugin-manifest.ts`** — add `credentialFields: ChannelCredentialField[]`
  to `ChannelPluginManifest` (sits beside the existing `configSchema: ZodType`).

One type per file (matches `channel-capability.ts`).

### 2. Meta plugin descriptor (`plugins/meta-whatsapp/meta-whatsapp.plugin.ts`)

Extend the manifest literal:
```ts
credentialFields: [
  { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
  { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
  { key: 'systemToken', label: 'System token', type: 'secret', required: true },
]
```
Keys mirror `metaCredentialsSchema` exactly (CRED-08). No engine code changes.

### 3. Use-case (`core/use-cases/list-available-plugins.use-case.ts`)

`AvailablePlugin` gains `credentialFields: ChannelCredentialField[]`; `execute()` maps
`manifest.credentialFields` straight through alongside `id/name/capabilities`. Still
no `configSchema` on the wire.

### 4. Contract (`packages/api-contracts/src/channel/channel-plugins.contract.ts`)

Add a field schema and extend the plugin entry:
```ts
export const ChannelCredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'secret']),
  required: z.boolean(),
})

export const ChannelPluginsResponseSchema = z.object({
  plugins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      capabilities: z.array(z.enum(['freeform', 'template', 'media'])),
      credentialFields: z.array(ChannelCredentialFieldSchema),
    }),
  ),
})
```
`ChannelPluginsResponse` type re-infers automatically; `channel.api.ts` and
`use-channel-plugins.ts` need no change (they pass the response type through).

### 5. Web form (`apps/web/src/features/channel/components/`)

Split to honour the ≤50-line component rule:

- **`credential-fields-input.tsx`** (new) — presentational. Props:
  `fields: ChannelCredentialField[]` (the contract-inferred type),
  `values: Record<string, string>`, `onChange(values)`. Renders one
  `Field`/`FieldLabel`/`Input` per field; `type === 'secret'` → `<Input type="password" autoComplete="off">`, else `type="text"`; `required` set from the descriptor;
  `value={values[key] ?? ''}`.
- **`channel-account-form.tsx`** (rewrite) — state: `pluginId`, `name`,
  `credentialValues: Record<string,string>`. Reads `useChannelPlugins`, finds the
  selected plugin, passes its `credentialFields` to `CredentialFieldsInput`. Changing
  the plugin resets `credentialValues` (CRED-05). Submit posts
  `{ pluginId, name, credentials: credentialValues }`. Submit disabled when `!pluginId`
  or a required field is empty (CRED-04); the server `configSchema` stays authoritative.
- The raw JSON `<Textarea>` and `parseJsonObject` use are removed from this form.
  (`parse-json-object.ts` is removed only if unused elsewhere — verify before deleting.)

A tiny pure helper keeps the disabled-logic out of JSX:
**`has-required-credentials.ts`** — `hasRequiredCredentials(fields, values): boolean`.

## Data flow

```
ChannelPluginManifest.credentialFields  (domain port, beside configSchema)
        │  ListAvailablePluginsUseCase.execute() maps through
        ▼
GET /channel-plugins → ChannelPluginsResponseSchema.credentialFields  (wire)
        │  useChannelPlugins() (typed, unchanged)
        ▼
ChannelAccountForm → CredentialFieldsInput  (generated inputs, secrets masked)
        │  submit { pluginId, name, credentials }
        ▼
POST /workspaces/:id/channel-accounts → registry.validateCredentials(configSchema)  (authority)
```

## Drift guard (CRED-09)

A plugin-local unit test in `plugins/meta-whatsapp/__test__/unit/` asserts the
descriptor and the schema agree:
- `Object.keys(metaCredentialsSchema.shape)` (zod v4 `ZodObject.shape`) equals the set
  of `manifest.credentialFields.map(f => f.key)` — neither side has an extra/missing key.
- Every `required: true` field is rejected when omitted (`safeParse` of an object
  missing that key fails), confirming the descriptor's required flags match the schema.

## Decisions

- **Mirror, don't derive.** Hand-author `credentialFields`; do not reflect over zod
  to build the form. Matches novu and avoids coupling the UI to zod internals; the
  guard test pays for the duplication. (Out of scope: auto-derivation.)
- **No new endpoint or route.** Reuse `GET /channel-plugins` and the existing
  create-account flow — only the plugin entry shape grows.
- **Minimal type vocabulary.** `'text' | 'secret'` only; richer field types are
  deferred until a channel needs them.

## Test plan (via `generate-tests`, thin/fat)

- **Fat:** `hasRequiredCredentials` (pure branch logic) → focused unit tests.
  Drift guard (CRED-09) → plugin-local unit test.
- **Thin:** use-case mapping and the contract are passthrough/declarative — covered by
  an e2e/contract assertion on `GET /channel-plugins` carrying `credentialFields`
  rather than a dedicated unit test.
- **Web:** `CredentialFieldsInput` rendering (one input per field, secret masked) and
  the plugin-change reset — component tests in the web harness.
- Final levels confirmed by the `generate-tests` skill during Execute, not mechanically
  per criterion.
</content>
