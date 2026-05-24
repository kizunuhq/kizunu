# 043 — API-Client Mutation Hook Reshape Tasks

## T-01 — Reshape all 29 hooks via script

Write a small perl/python script that, for each of the 29 hook files,
transforms `return useMutation({ ... })` to:

```ts
const { mutate, ...rest } = useMutation({ ... })
return { ...rest, <domainName>: mutate }
```

Where `<domainName>` comes from the design's map. Apply to every file.

## T-02 — Run typecheck; collect call-site failures

After T-01 the api-client package typechecks. The web app fails to
typecheck wherever a `.mutate(` was used against a reshaped hook.

## T-03 — Update every web call site

For each typecheck failure: either destructure the domain name or
rename `xxx.mutate(` to `xxx.<domainName>(`. Pick whichever reads
cleaner per site.

## T-04 — `bun check` + Chrome smoke

Full gate. Chrome smoke on login, logout, signup, forgot/reset password,
accept invite, workspace switcher, command-palette logout, email
verification resend, member invite.

## T-05 — Commit, push, PR, CI, squash-merge

Single squashable PR: "refactor(api-client): reshape mutation hooks to
domain-named return (feature 043)".
