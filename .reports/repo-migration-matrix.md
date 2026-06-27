# Solid codemod migration matrix

| Priority | Target | Mode | Status | Last run | Next action |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | 2026-06-25T21:30:59-0500 | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | 2026-06-26T05:00:36Z | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful | 2026-06-26T15:52:21Z | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | 2026-06-27T02:54:46Z | Continue solid-primitives fetch triage: reactive createResource stub reduced focused fetch failures to 3 of 16; inspect abort flag propagation, rejected resource error settling, and cache expiry refetch scheduling. |
| 5 | kobalte | manual-compare | pending |  | run migration feedback loop |
| 6 | solid | manual-compare | pending |  | run migration feedback loop |
