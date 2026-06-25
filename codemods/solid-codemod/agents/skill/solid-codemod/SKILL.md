---
name: "solid-codemod"
description: "Migrate local-safe Solid 1.x patterns to Solid 2"
allowed-tools:
  - Bash(codemod *)
---

# solid-codemod

codemod-compatibility: skill-package-v1
codemod-skill-version: 0.1.0

Use `references/index.md` as the primary instruction index for this Solid 1.x to 2 migration package.

## Execution Contract

1. Load package-specific guidance from `references/index.md`.
2. Apply the package strategy to the current repository context using Codemod CLI commands.
3. Report what changed, what was skipped, and any manual follow-ups.
