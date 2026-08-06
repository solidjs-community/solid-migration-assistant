# Solid 2 migration codemod

This package has two workflows: read-only analysis and aggregate safe transformation. It currently scans only TSX files in a narrow Solid 1.9 client-app profile.

The current rules recognize only exact named `solid-js` bindings and static web imports:

- direct, one- to three-semantic-argument, non-spread `createComputed(...)` calls (`agent-guided`);
- direct, one-argument `createEffect(...)` calls bound to `import { createEffect } from "solid-js"`;
- direct two- and three-argument `createMemo(...)` calls (`manual`);
- direct `mergeProps(...)` calls (`agent-guided`);
- direct, one-argument `onMount(...)` calls bound to `import { onMount } from "solid-js"`;
- static ES imports whose module source is exactly `solid-js/web`.

The target contract is Solid `2.0.0-beta.30` at upstream commit `edb3e36faad698d0368d5eade19e4cb3b5d5cf10`.

- Solid 1.9.14 [`createComputed` accepts one to three arguments](https://app.unpkg.com/solid-js@1.9.14/files/types/reactive/signal.d.ts), while the pinned target [removes it](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/index.ts#L138-L156). The [official migration guide](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/documentation/solid-2.0/MIGRATION.md#L716-L755) identifies `createMemo`, split `createEffect`, and function-form `createSignal`; the pinned [derived-ownership guidance](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/documentation/solid-2.0/02-signals-derived-ownership.md#L146-L165) also shows derived `createStore`, depending on intent.
- Solid 2 exposes [`merge`](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid-signals/src/store/utils.ts#L267-L368) as the user-facing replacement for `mergeProps`. Its right-most source wins when a property exists even when its value is `undefined`; `merge()` returns `undefined` rather than `{}`, and one-source results may preserve source identity, so the analyzer does not blindly rename calls.
- Solid 1.9.14 [`createMemo` uses its second argument as an initial value and its third as options](https://unpkg.com/solid-js@1.9.14/types/reactive/signal.d.ts), while Solid 2 [`createMemo` accepts options as its second argument and no initial-value position](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/client/hydration.ts#L921-L964). Solid 1 two- and three-argument calls therefore require manual review.
- The pinned target [removes `onMount` in favor of `onSettled`](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/index.ts#L156); [`onSettled` callbacks may return an owner-bound cleanup function](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid-signals/src/signals.ts#L823-L838).

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

Version one does not cover JavaScript, `.ts` files, aliases, namespace calls, indirect calls, shadowed bindings, unsupported `createComputed`, `createEffect`, `createMemo`, or `onMount` argument counts, re-exports, dynamic imports, `require`, TypeScript import types, configuration, dependencies, SSR, libraries, monorepos, or cross-file meaning. `createComputed`, `mergeProps`, and `onMount` findings are guidance only; legacy `createMemo` initial arguments are manual findings. None of these four rules transforms source. These limits are repeated in every report.

## Verify

```sh
pnpm verify
```
