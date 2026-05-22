# Web Channels Admin Specification

Admin screen for workspace channel accounts (feature 015). Add a channel account
(plugin select from `useChannelPlugins` + name + credentials JSON), grant a member
access (account + member selects), and list the workspace's accounts. Built from the
installed shadcn primitives (`select`/`textarea` added). No web test harness yet —
verified via `bun check` + build.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CHN-01 | Add channel account | Tasks | Verified |
| CHN-02 | Grant access | Tasks | Verified |
| CHN-03 | List accounts | Tasks | Verified |
