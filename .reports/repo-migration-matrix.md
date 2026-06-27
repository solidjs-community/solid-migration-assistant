# Solid codemod migration matrix

| Priority | Target | Status | Mode | Last run | Next action |
|---:|---|---|---|---|---|
| 1 | test | successful | synthetic | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | blocked-manual-dependency-remediation | direct-migrate | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | successful | manual-compare | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | blocked-manual-pagination-migration | manual-compare | 2026-06-27T06:49:41Z | blocked on manual pagination source/test migration; proceed to kobalte for additional codemod feedback unless this exact pagination pattern is selected for narrow automation |
| 5 | kobalte | needs-codemod-fix | manual-compare | 2026-06-27T19:56:49Z | Continue kobalte triage on remaining diagnostics: combobox/select implicit-any callbacks, search ts-expect-error, time-field indexing, dismissable-layer/toast callback typing. |
| 6 | solid | pending | manual-compare |  | run migration feedback loop |
