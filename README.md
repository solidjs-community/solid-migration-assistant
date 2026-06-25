# Solid Codemod

Safe, review-friendly codemods for moving Solid 1.x projects toward Solid 2.

This repository currently ships `solid-codemod`, a Codemod package that applies local-safe migrations and leaves behavior-sensitive changes as `TODO(solid-2)` review markers. It is designed to reduce upgrade toil without pretending that semantic Solid 2 changes can always be automated.

## What It Handles

- Solid package and import path moves, including renderer packages such as `@solidjs/web`.
- Safe API renames such as `Suspense` to `Loading`, `ErrorBoundary` to `Errored`, and `mergeProps` to `merge`.
- Local JSX shape updates for supported `Index`, `SuspenseList`, `ErrorBoundary`, context provider, and `classList` cases.
- `package.json` and JSX config updates for Solid 2-compatible package ranges and import sources.
- Review markers for migrations that need application intent, tests, or runtime diagnostics.

See [`codemods/solid-codemod/README.md`](codemods/solid-codemod/README.md) for the detailed rule list and limits.

## Run Locally

```bash
pnpm install
cd codemods/solid-codemod
pnpm test
pnpm check-types
codemod run -w workflow.yaml --dry-run --target /path/to/solid-app
codemod run -w workflow.yaml --target /path/to/solid-app
```

Always run codemods on a clean Git worktree so you can inspect the diff and revert safely if needed.

## Repository Layout

```text
codemods/solid-codemod/   Solid 1.x to 2 codemod package
CONTEXT.md                Project terminology and migration language
.reports/                 Research notes and migration reports
.repos/                   Local research fixtures and upstream references
```

## Development

```bash
cd codemods/solid-codemod
pnpm test
pnpm check-types
codemod workflow validate -w workflow.yaml
```

The goal is a safe mechanical migration first. Anything that requires broader program intent should be surfaced clearly for review instead of rewritten blindly.
