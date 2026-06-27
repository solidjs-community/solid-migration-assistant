# Solid codemod migration matrix

Last updated: 2026-06-27T05:11:25Z

| Priority | Target | Mode | Status | Baseline | Manual | Last run | Next action |
|---:|---|---|---|---|---|---|---|
| 1 | test | synthetic | successful | master |  | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | origin/main |  | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful | origin/main | next | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | main | next | 2026-06-27T05:11:25Z | createMemo nested-arrow initial value fixed; continue solid-primitives SSR triage for createInfiniteScroll/createEffect server behavior, presence document server guard, and context Provider undefined behavior. |
| 5 | kobalte | manual-compare | pending | origin/main | origin/solid2 |  | run migration feedback loop |
| 100 | solid | manual-compare | pending | origin/main | next |  | run migration feedback loop |
