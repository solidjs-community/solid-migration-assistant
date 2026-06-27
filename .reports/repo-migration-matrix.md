# Solid codemod migration matrix

Last updated: 2026-06-27T01:22:26Z

| Priority | Target | Mode | Status | Next action | Last run |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful | run migration feedback loop for powerchat | 2026-06-25T21:30:59-0500 |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. | 2026-06-26T05:00:36Z |
| 3 | solid-router | manual-compare | successful | Proceed to solid-primitives migration feedback loop. | 2026-06-26T15:52:21Z |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | Continue solid-primitives fetch triage: design/fixture a safe createResource/resource runtime migration or document these resource-heavy files as manual after eliminating the undefined source crash class. | 2026-06-27T01:22:26Z |
| 5 | kobalte | manual-compare | pending | run migration feedback loop |  |
| 100 | solid | manual-compare | pending | run migration feedback loop |  |
