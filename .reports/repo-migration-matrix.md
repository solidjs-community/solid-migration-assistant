# Solid codemod migration matrix

Last updated: 2026-06-27T06:15:00Z

| Priority | Target | Mode | Status | Baseline | Manual | Last run | Next action |
|---:|---|---|---|---|---|---|---|
| 1 | test | synthetic | successful |  |  | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation |  |  | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful |  |  | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | main | next | 2026-06-27T06:15:00Z | continue solid-primitives pagination triage; createInfiniteScroll timeout likely needs conservative manual or TODO treatment for the createResource/createComputed cluster. |
| 5 | kobalte | manual-compare | pending |  |  |  | run migration feedback loop |
| 100 | solid | manual-compare | pending |  |  |  | run migration feedback loop |
