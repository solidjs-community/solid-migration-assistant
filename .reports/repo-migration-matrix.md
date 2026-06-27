# Solid codemod repo migration matrix

Last updated: 2026-06-27T21:31:10Z

| Priority | Repo | Mode | Status | Last run | Next action |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | 2026-06-26T05:00:36Z | manual dependency remediation needed for Solid Start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | blocked-manual-pagination-migration | 2026-06-27T06:49:41Z | blocked on manual pagination source/test migration; proceed to kobalte for additional codemod feedback unless this exact pagination pattern is selected for narrow automation |
| 5 | kobalte | manual-compare | needs-codemod-fix | 2026-06-27T21:31:10Z | Continue Kobalte triage on strict Solid 2 JSX ref/event-handler/RemoveAttribute diagnostics, likely starting with repeated hidden input ref/event handler patterns. |
| 100 | solid | manual-compare | pending |  | run migration feedback loop |
