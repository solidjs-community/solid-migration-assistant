# Solid codemod migration matrix

Last updated: 2026-06-26T15:00:19Z

| Priority | Repo | Mode | Status | Default | Manual | Next action |
|---:|---|---|---|---|---|---|
| 1 | test | synthetic | successful | master | None | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation | origin/main | None | manual dependency remediation needed for @solidjs/start and Solid 1-era ecosystem packages; proceed to solid-router for codemod feedback unless these dependencies publish Solid 2-compatible releases. |
| 3 | solid-router | manual-compare | needs-codemod-fix | origin/main | next | Continue solid-router runtime triage for createResource async error handling, action rejection handling, and RouterContext context semantics. |
| 4 | solid-primitives | manual-compare | pending | main | next | run migration feedback loop |
| 5 | kobalte | manual-compare | pending | origin/main | origin/solid2 | run migration feedback loop |
| 100 | solid | manual-compare | pending | origin/main | next | run migration feedback loop |
