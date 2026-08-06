# Solid 2 migration codemod

This package has two workflows: read-only analysis and aggregate safe transformation. It currently scans only TSX files in a narrow Solid 1.9 client-app profile.

The current rules recognize only:

- direct, one-argument `createEffect(...)` calls bound to `import { createEffect } from "solid-js"`;
- static ES imports whose module source is exactly `solid-js/web`.

The target contract is Solid `2.0.0-beta.30` at upstream commit `edb3e36faad698d0368d5eade19e4cb3b5d5cf10`.

## Analyze

From the workspace root:

```sh
pnpm analyze --target /path/to/vite-solid-app
```

Analysis returns success when it finds migration work. It writes only:

```text
.codemod-reports/solid-v2/solid-v2-migration-report.json
.codemod-reports/solid-v2/solid-v2-migration-report.html
```

The JSON file is canonical. The HTML file embeds the same data.

## Apply all registered safe transforms

```sh
pnpm transform --target /path/to/vite-solid-app
```

This separate workflow currently rewrites all exact static `solid-js/web` import sources to `@solidjs/web`. Every safe rule is explicitly imported by `scripts/transform.ts`, rematches source without reading a report, returns edits for one final commit, and fails if edits overlap.

## Architecture

There are three operational scripts:

```text
scripts/analyze.ts
scripts/write-report.ts
scripts/transform.ts
```

Rule modules are grouped by domain under `rules/`. `scripts/analyze.ts` explicitly imports every analyzer, and `scripts/transform.ts` explicitly imports every safe transform. Shared report contracts and path handling live under the root `shared/` folder. Rule tests and fixtures are colocated with their domain modules; the small end-to-end workflow test remains under `tests/`.

The package commands use an internal workflow runner under `shared/` to require and validate `--target` before invoking either workflow. It is infrastructure, not an additional analysis or transform entry script.

Each analyzer returns its rule metadata and findings. Findings contain their own rule-specific guidance, including stop conditions for agent-guided work. No skill is installed or required.

## Deliberate limits

Version one does not cover JavaScript, `.ts` files, aliases, namespace effect calls, two-argument effects, re-exports, dynamic imports, `require`, TypeScript import types, configuration, dependencies, SSR, libraries, monorepos, or cross-file meaning. These limits are repeated in every report.

## Verify

```sh
pnpm verify
```
