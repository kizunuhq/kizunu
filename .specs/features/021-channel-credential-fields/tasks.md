# Channel Credential Fields — Tasks

Ordered along the type-safe boundary (contract → API → client → web), then tests.
Each task is atomic and conventional-commit-sized. Gate after each: `bun check` green.

`[P]` = parallelizable with siblings once dependencies are met.

---

## T1 — Backend port: credential field types on the manifest

- **What:** Add `ChannelCredentialFieldType` (`'text' | 'secret'`) and
  `ChannelCredentialField` ({ key, label, type, required }); add
  `credentialFields: ChannelCredentialField[]` to `ChannelPluginManifest`.
- **Where:** `apps/api/src/modules/channel/core/plugin/channel-credential-field-type.ts`,
  `.../channel-credential-field.ts`, `.../channel-plugin-manifest.ts`.
- **Depends on:** none.
- **Reuses:** the `channel-capability.ts` one-type-per-file pattern.
- **Done when:** types compile; manifest requires `credentialFields`.
- **Covers:** CRED-06.
- **Tests:** none (type-only); compile is the check.
- **Gate:** `bun typecheck`.

## T2 — Meta plugin declares its credential fields

- **What:** Add the `credentialFields` literal (`wabaId` text, `phoneNumberId` text,
  `systemToken` secret — all required) to `MetaWhatsappPlugin.manifest`. Update the
  `fake-channel-plugin.ts` test double to satisfy the new manifest field.
- **Where:** `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts`,
  `apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts`.
- **Depends on:** T1.
- **Reuses:** `metaCredentialsSchema` keys.
- **Done when:** manifest carries the three fields; fake plugin compiles.
- **Covers:** CRED-08.
- **Tests:** covered by T3's guard.
- **Gate:** `bun typecheck`.

## T3 — Drift guard: descriptor ↔ configSchema (fat) [P after T2]

- **What:** Plugin-local unit test asserting `metaCredentialsSchema.shape` keys equal
  the descriptor's field keys, and that each required field is rejected when omitted.
- **Where:** `apps/api/src/modules/channel/plugins/meta-whatsapp/__test__/unit/meta-credential-fields.spec.ts`.
- **Depends on:** T2.
- **Done when:** test passes; fails if a key is added/removed on either side.
- **Covers:** CRED-09.
- **Tests:** this is the test (authored via `generate-tests`).
- **Gate:** `bunx vp test` (this spec).

## T4 — Use-case maps credentialFields through

- **What:** Add `credentialFields` to `AvailablePlugin`; map `manifest.credentialFields`
  in `ListAvailablePluginsUseCase.execute()`.
- **Where:** `apps/api/src/modules/channel/core/use-cases/list-available-plugins.use-case.ts`.
- **Depends on:** T1.
- **Done when:** the use-case returns fields; no `configSchema` on the output.
- **Covers:** CRED-07 (API side).
- **Tests:** thin passthrough — covered by T6 e2e.
- **Gate:** `bun typecheck`.

## T5 — Contract: ChannelCredentialFieldSchema + extend plugins response

- **What:** Add `ChannelCredentialFieldSchema` and `credentialFields` to
  `ChannelPluginsResponseSchema`.
- **Where:** `packages/api-contracts/src/channel/channel-plugins.contract.ts`.
- **Depends on:** none (can land first; T4 must agree with its shape).
- **Reuses:** existing contract file conventions (zod v4 top-level formats).
- **Done when:** `ChannelPluginsResponse` type includes `credentialFields`; client/web
  type-check against it.
- **Covers:** CRED-07 (wire side).
- **Tests:** none directly; exercised by T6.
- **Gate:** `bun typecheck`, `bun scripts/check-zod-v4.ts`.

## T6 — e2e: GET /channel-plugins carries credentialFields (thin) [P after T4,T5]

- **What:** Assert the Meta plugin entry in `GET /channel-plugins` includes the three
  fields with correct `type`/`required`.
- **Where:** existing channel e2e suite (extend, don't duplicate).
- **Depends on:** T4, T5.
- **Done when:** e2e green.
- **Covers:** CRED-07, CRED-08 (over the wire).
- **Tests:** this is the test (via `generate-tests`, supertest e2e).
- **Gate:** `bunx vp test` (e2e, serialized).

## T7 — Web: CredentialFieldsInput + required helper

- **What:** Add presentational `CredentialFieldsInput` (one input per field, secret →
  masked `type="password"`, required from descriptor) and the pure
  `hasRequiredCredentials(fields, values)` helper.
- **Where:** `apps/web/src/features/channel/components/credential-fields-input.tsx`,
  `apps/web/src/features/channel/lib/has-required-credentials.ts` (or `features/channel/`
  per existing layout).
- **Depends on:** T5.
- **Reuses:** shadcn `Field`/`FieldLabel`/`Input` primitives.
- **Done when:** component renders fields from props; helper returns false when any
  required value is blank.
- **Covers:** CRED-01, CRED-02, CRED-04 (partial).
- **Tests:** `hasRequiredCredentials` (fat) → unit; `CredentialFieldsInput` render +
  masking → component test (via `generate-tests`).
- **Gate:** `bunx vp test`, `bun typecheck`.

## T8 — Web: rewrite channel-account-form to use generated fields

- **What:** Replace the JSON `<Textarea>` with `CredentialFieldsInput`; manage
  `credentialValues` record; reset on plugin change; disable submit on `!pluginId` or
  missing required; submit `{ pluginId, name, credentials }`. Remove `parseJsonObject`
  usage; delete `parse-json-object.ts` only if unused elsewhere (verify).
- **Where:** `apps/web/src/features/channel/components/channel-account-form.tsx`.
- **Depends on:** T7.
- **Done when:** form has no JSON textarea; plugin change clears values; submit works.
- **Covers:** CRED-01, CRED-03, CRED-04, CRED-05.
- **Tests:** plugin-change reset + submit payload → component test (via `generate-tests`).
- **Gate:** `bunx vp test`, `bun typecheck`, `bun scripts/check-import-depth.ts`.

## T9 — Docs: roadmap/state/CONCERNS touch-up

- **What:** Mark feature `021` landed in `ROADMAP.md`; add a STATE.md lesson; note that
  the credential descriptor does not change the unencrypted-credentials concern.
- **Where:** `.specs/project/ROADMAP.md`, `.specs/project/STATE.md`.
- **Depends on:** T8.
- **Done when:** docs reflect the shipped behavior.
- **Covers:** DoD item 6.
- **Gate:** none.

---

## Coverage check

| Requirement | Task(s) |
| --- | --- |
| CRED-01 | T7, T8 |
| CRED-02 | T7 |
| CRED-03 | T8 |
| CRED-04 | T7, T8 |
| CRED-05 | T8 |
| CRED-06 | T1 |
| CRED-07 | T4, T5, T6 |
| CRED-08 | T2, T6 |
| CRED-09 | T3 |

9 / 9 requirements mapped. No unmapped requirements.

## Suggested commits

1. T1+T2 — `feat(channel): declare credential fields on plugin manifest`
2. T3 — `test(channel): guard meta credential descriptor against schema`
3. T4+T5 — `feat(channel): expose credentialFields through plugins contract`
4. T6 — `test(channel): assert channel-plugins exposes credential fields`
5. T7+T8 — `feat(web): generate channel-account credential form from plugin fields`
6. T9 — `docs: record channel credential fields feature`
</content>
