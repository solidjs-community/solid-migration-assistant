# Solid 2 read-only migration analysis

This package starts with detection. Its default workflow scans a narrow Solid 1.9 TypeScript client-app profile and writes a report without changing source or configuration.

The first slice recognizes only:

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

## Apply the one safe transform

```sh
pnpm transform:web-imports --target /path/to/vite-solid-app
```

This separate workflow rewrites all exact static `solid-js/web` import sources to `@solidjs/web`. It does not read a previous report and is idempotent.

## Deliberate limits

Version one does not cover JavaScript, aliases, namespace effect calls, two-argument effects, re-exports, dynamic imports, `require`, TypeScript import types, configuration, dependencies, SSR, libraries, monorepos, or cross-file meaning. These limits are repeated in every report.

The included `migrate-solid-create-effect` skill explains the single plain effect shape. Analysis does not install or invoke it.

## Verify

```sh
pnpm verify
```
