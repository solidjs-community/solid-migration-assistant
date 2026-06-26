# Solid codemod migration matrix

Last updated: 2026-06-26T21:51:22Z

| Priority | Target | Mode | Status | Next action | Last run |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | run migration feedback loop for powerchat | 2026-06-25T21:30:59-0500 |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. | 2026-06-26T05:00:36Z |
| 3 | solid-router | manual-compare | successful | Proceed to solid-primitives migration feedback loop. | 2026-06-26T15:52:21Z |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | Triage remaining solid-primitives semantic failures after the empty createSignal syntax fix; recommended next target is fetch createResource/requestData semantics or an environment-correct page-visibility/connectivity ownedWrite verification. | 2026-06-26T21:51:22Z |
| 5 | kobalte | manual-compare | pending | run migration feedback loop |  |
| 100 | solid | manual-compare | pending | run migration feedback loop |  |
