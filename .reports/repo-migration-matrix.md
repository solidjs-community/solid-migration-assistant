# Solid codemod migration matrix

| Priority | Target | Mode | Status | Last run | Next action |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | 2026-06-26T18:46:59Z | Triage remaining focused solid-primitives failures after dispatchEvent flush automation: createComputed stubs still do not rerun for keyboard/event-dispatcher, refs/websocket need additional flush/scheduling handling. |
| 5 | kobalte | manual-compare | pending |  | run migration feedback loop |
| 6 | solid | manual-compare | pending |  | run migration feedback loop |
