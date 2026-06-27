# Solid codemod repo migration matrix

Last updated: 2026-06-27T12:21:27Z

| Target | Status | Mode | Last run | Next action |
| --- | --- | --- | --- | --- |
| test | successful | synthetic | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| powerchat | blocked-manual-dependency-remediation | direct-migrate | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| solid-router | successful | manual-compare | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| solid-primitives | blocked-manual-pagination-migration | manual-compare | 2026-06-27T06:49:41Z | blocked on manual pagination source/test migration; proceed to kobalte for additional codemod feedback unless this exact pagination pattern is selected for narrow automation |
| kobalte | needs-codemod-fix | manual-compare | 2026-06-27T12:21:27Z | continue kobalte after resolving disposable worktree workspace module links; do not add broad render-prop rewrites until @kobalte/utils is resolved and isFunction narrowing can be trusted |
| solid | pending | manual-compare |  | run migration feedback loop |
