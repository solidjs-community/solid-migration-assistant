# Solid codemod migration matrix

Last updated: 2026-06-27T07:41:26Z

| Priority | Target | Mode | Status | Baseline | Manual | Last run | Next action |
|---:|---|---|---|---|---|---|---|
| 1 | test | synthetic | successful |  | None | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation |  | None | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful |  | next | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | blocked-manual-pagination-migration | main | next | 2026-06-27T06:49:41Z | blocked on manual pagination source/test migration; proceed to kobalte for additional codemod feedback unless this exact pagination pattern is selected for narrow automation |
| 5 | kobalte | manual-compare | needs-codemod-fix | origin/main | v2/basic-migration | 2026-06-27T07:41:26Z | continue kobalte with fixture-backed context provider or Solid JSX type import migration; repo-specific dependency links remain manual/out-of-scope |
| 100 | solid | manual-compare | pending |  | next |  | run migration feedback loop |
