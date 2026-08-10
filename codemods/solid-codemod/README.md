# Solid 2 migration analyzer

This package implements a single read-only workflow for a narrow Solid 1.9 client-application profile. It scans TSX files and prints one detailed, location-bearing guidance string per supported migration site. The workflow returns no edits and writes no files.

The migration target is pinned to Solid `2.0.0-beta.30` at upstream commit [`edb3e36`](https://github.com/solidjs/solid/tree/edb3e36faad698d0368d5eade19e4cb3b5d5cf10).

## Analyze

From the workspace root:

```sh
pnpm analyze --target /absolute/path/to/a/solid-project
```

A run with detections exits successfully. Guidance is deduplicated, sorted by file, line, column, and rule ID, and printed once as a terminal aggregate. The analyzer does not edit the target or create persistent output.

## Supported detections

- **`S2-IMPORT-WEB-001`** — static ES imports whose module source is exactly `solid-js/web`.
- **`S2-COMPUTED-001`** — supported direct, non-spread `createComputed(...)` calls reached through the exact named `solid-js` binding.
- **`S2-EFFECT-001`** — direct one-argument `createEffect(...)` calls reached through the exact named binding.
- **`S2-MEMO-001`** — direct two- and three-argument `createMemo(...)` calls reached through the exact named binding.
- **`S2-PROPS-001`** — direct `mergeProps(...)` calls reached through the exact named binding.
- **`S2-LIFECYCLE-001`** — direct one-argument `onMount(...)` calls reached through the exact named binding.

Each message explains why the site matters, what nearby behavior to inspect, a possible migration direction, and conditions under which an agent or developer should stop rather than guess.

## Version evidence

- Solid 1.9.14 [`createComputed` accepts one to three arguments](https://app.unpkg.com/solid-js@1.9.14/files/types/reactive/signal.d.ts), while the pinned target [removes it](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/index.ts#L138-L156). The [official migration guide](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/documentation/solid-2.0/MIGRATION.md#L716-L755) discusses `createMemo`, split `createEffect`, and function-form `createSignal`; the pinned [derived-ownership guidance](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/documentation/solid-2.0/02-signals-derived-ownership.md#L146-L165) also shows derived `createStore`, depending on intent.
- Solid 2 exposes [`merge`](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid-signals/src/store/utils.ts#L267-L368) as the user-facing replacement for `mergeProps`. Its right-most source wins when a property exists even when its value is `undefined`; zero- and one-source behavior, source identity, and mutation can also make a blind rename unsafe.
- Solid 1.9.14 [`createMemo` uses its second argument as an initial value and its third as options](https://unpkg.com/solid-js@1.9.14/types/reactive/signal.d.ts), while Solid 2 [`createMemo` accepts options as its second argument and has no initial-value position](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/client/hydration.ts#L921-L964).
- The pinned target [removes `onMount` in favor of `onSettled`](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid/src/index.ts#L156); [`onSettled` callbacks may return an owner-bound cleanup function](https://github.com/solidjs/solid/blob/edb3e36faad698d0368d5eade19e4cb3b5d5cf10/packages/solid-signals/src/signals.ts#L823-L838).

## Architecture

The production workflow contains only two scripts:

```text
scripts/analyze.ts  # run every registered analyzer and aggregate guidance
scripts/emit.ts     # sort and print the complete aggregate once
```

Rule modules are grouped by domain under `rules/`. Shared direct-import resolution, guidance formatting, and deterministic ordering live under `shared/`. `shared/run-workflow.mjs` validates `--target` and invokes the single workflow.

Rule tests and input/expected fixtures are colocated with each domain module. Expected files are byte-identical to their inputs because every analyzer returns no edit. The end-to-end project fixture is copied to a temporary directory before each workflow run.

## Deliberate limits

The preview does not cover JavaScript, `.ts` files, aliased or namespace bindings, indirect calls, shadowed bindings, unsupported argument counts, re-exports, dynamic imports, `require`, TypeScript import types, configuration, dependencies, SSR, libraries, monorepos, or cross-file intent. A clean run does not imply complete Solid 2 migration coverage.

Automated transforms are roadmap-only. This package exposes no transform command, workflow, test, or implementation.

## Verify

From the workspace root:

```sh
pnpm verify
```

Verification checks detection-only architecture, comprehensive rule boundaries, exact and repeatable terminal output, fixture immutability, TypeScript types, and workflow schema validity.
