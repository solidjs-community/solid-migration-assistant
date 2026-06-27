# Solid codemod migration matrix

Last updated: 2026-06-27T16:47:44Z

| Priority | Target | Mode | Status | Last run | Next action |
|---:|---|---|---|---|---|
| 1 | test | synthetic | successful |  | run migration feedback loop for powerchat |
| 2 | powerchat | direct-migrate | blocked-manual-dependency-remediation |  | manual dependency remediation needed |
| 3 | solid-router | manual-compare | successful |  | Proceed to solid-primitives or kobalte |
| 4 | solid-primitives | manual-compare | blocked-manual-pagination-migration |  | manual pagination migration selected or out-of-scope |
| 5 | kobalte | manual-compare | needs-codemod-fix | 2026-06-27T16:47:44Z | triage remaining kobalte categories: file-field readonly context arrays, createSignal initializer overloads, implicit-any/list narrowing, or combobox test getByRole scope |
| 6 | solid | manual-compare | pending |  | run migration feedback loop |
