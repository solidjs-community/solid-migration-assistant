# Solid codemod migration matrix

Last updated: 2026-06-26T19:33:33Z

| Priority | Target | Mode | Status | Next action | Last run |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | run migration feedback loop for powerchat | 2026-06-25T21:30:59-0500 |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. | 2026-06-26T05:00:36Z |
| 3 | solid-router | manual-compare | successful | Proceed to solid-primitives migration feedback loop. | 2026-06-26T15:52:21Z |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | Triage remaining solid-primitives event-dispatcher isServer/client runtime behavior and workspace package build/link verification for keyboard/refs. | 2026-06-26T19:33:33Z |
| 5 | kobalte | manual-compare | pending | run migration feedback loop |  |
| 6 | solid | manual-compare | pending | run migration feedback loop |  |
