# Solid migration analysis language

Use these terms for the current vertical slice.

**Finding**

One exact source location matched by a supported rule. A finding records evidence and a next route; it does not claim that the whole codebase was analyzed for every Solid 2 change.

**Safe transform**

An exact local change with one proven output. Safe transforms live in an explicit workflow separate from analysis.

**Agent-guided change**

A detected migration site whose finding contains narrow migration guidance, but where an agent must inspect intent and may need to stop. Analysis never applies these changes.

**Manual decision**

A detected site that requires application behavior or ownership information beyond the available local evidence. The report schema supports this route even though the current rules emit none.

**Read-only analysis**

A workflow whose transforms always return `null`. It may write canonical JSON and self-contained HTML under `.codemod-reports/`, but it does not edit scanned source or configuration.

**Coverage boundary**

The exact project profile, syntax, and rule set the report can claim. Every report lists unsupported syntax and project types rather than implying broad coverage.

**Target contract**

The pinned Solid version and upstream source commit used to define a rule. The first slice targets `solid-js@2.0.0-beta.30` at `edb3e36faad698d0368d5eade19e4cb3b5d5cf10`.
