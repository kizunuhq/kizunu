# Web CRM Admin Specification

Admin screen (feature 016) for the CRM connector + entry triggers. Add a connector
account (connector + name + credentials JSON), map a CRM stage to a cadence via an
entry trigger (connector + stage id + cadence selects), and list/remove triggers.
Reuses the shared LookupSelect + parseJsonObject helper. No web test harness — verified
via `bun check` + build.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CRM-UI-01 | Add connector account | Tasks | Verified |
| CRM-UI-02 | Create entry trigger | Tasks | Verified |
| CRM-UI-03 | List/remove triggers | Tasks | Verified |
