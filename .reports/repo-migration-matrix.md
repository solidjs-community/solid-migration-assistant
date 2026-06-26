# Solid codemod migration matrix

Last updated: 2026-06-26T16:38:00Z

| Priority | Repo | Mode | Status | Default | Manual | Next action |
|---:|---|---|---|---|---|---|
| 1 | test | synthetic | successful | master | None | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | origin/main | None | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | successful | origin/main | next | Proceed to solid-primitives migration feedback loop. |
| 4 | solid-primitives | manual-compare | needs-codemod-fix | main | next | rerun solid-primitives focused triage; inspect owned-write/runtime failures and compare manual next branch package-by-package |
| 5 | kobalte | manual-compare | pending | origin/main | origin/solid2 | run migration feedback loop |
| 100 | solid | manual-compare | pending | origin/main | next | run migration feedback loop |
