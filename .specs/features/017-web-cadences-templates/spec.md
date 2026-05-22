# Web Cadences + Templates Specification

The /workspace/cadences screen (feature 017): template create/list/remove (name,
channel plugin, provider template name, language) and a cadence builder — name + an
ordered steps editor (plugin/template/delay per step) + an optional onReply move-stage —
plus the cadence list (status, step count, remove). Completes the v0.1 Minimum UI.
Reuses PluginSelect/LookupSelect and a build-cadence-request helper. No web test harness
— verified via `bun check` + build.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CAD-UI-01 | Template CRUD | Tasks | Verified |
| CAD-UI-02 | Cadence builder (steps + onReply) | Tasks | Verified |
| CAD-UI-03 | Cadence list/remove | Tasks | Verified |
