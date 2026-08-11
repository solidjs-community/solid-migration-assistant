# Solid Migration Assistant

This package implements Solid Migration Assistant as a single read-only workflow for a narrow Solid 1.9 client-application profile. It scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source files and prints one detailed, location-bearing guidance string per supported migration site. The workflow returns no edits and writes no files.

The migration target is pinned to Solid `2.0.0-beta.32` at upstream commit [`3194631`](https://github.com/solidjs/solid/tree/3194631aeeb2b2e360817dc887ab5cbce7548359).

## Analyze with npm

> **Beta scope:** version `0.1.1` targets Solid `2.0.0-beta.32`, analyzes project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, and implements only the detections documented below. A clean run is not proof that a project is ready for Solid 2.

After npm publication, run this from the project root with Node 20 or newer and npm (pnpm is not required):

The assistant itself imposes no operating-system, CPU-architecture, or libc restriction in its npm metadata or launcher. Actual execution support depends on native runtime availability from the pinned Codemod 1.12.13 dependency and on the installing package manager and platform. This project does not claim that Codemod provides a working native runtime for every platform or architecture; installation or launch errors from Codemod remain authoritative.

```sh
npx --yes solid-migration-assistant@latest
```

The current directory is the default target. An explicit target may be absolute or relative to the current directory:

```sh
npx --yes solid-migration-assistant@latest --target /path/to/a/solid-project
```

A run with detections exits successfully. Complete opaque guidance strings are exact-deduplicated, sorted lexically as whole strings, and printed once as a terminal aggregate. The analyzer does not edit the target or create persistent output there, and Codemod analytics are disabled. Codemod may persist workflow and task state in normal platform user-data directories outside the target; the assistant does not redirect or remove that runtime state.

## Supported detections

- **Solid web package imports** — static ES imports whose module source is exactly `solid-js/web`; each finding links the immutable [beta.32 migration-guide requirement](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now).
- **Remaining Solid import subpaths** — static ES imports whose module source is exactly `solid-js/store`, `solid-js/h`, `solid-js/html`, `solid-js/universal`, `solid-js/jsx-runtime`, or `solid-js/jsx-dev-runtime`; each finding links the immutable [beta.32 migration-guide requirement](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now).
- **JSX component migrations** — binding-resolved JSX uses of unaliased `Suspense`, `ErrorBoundary`, `SuspenseList`, and `Index` imports from `solid-js`; every finding requires manual review and links the matching immutable pinned guide for [`Suspense` / `ErrorBoundary`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#suspense--errorboundary--loading--errored), [`Index`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#list-rendering-index-is-gone-and-for-handles-each-keying-mode), or [`SuspenseList`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#coordinating-loading-boundaries-suspenselist--reveal).
- **JSX `classList` migration** — exact `classList` attributes on lowercase intrinsic JSX opening and self-closing elements; every finding requires manual review and links the immutable pinned [`classList` → `class` object/array forms guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#classlist--class-objectarray-forms).
- **`createComputed` replacement review** — direct non-spread `createComputed(...)` calls with one through three semantic arguments reached through the exact unaliased named `solid-js` binding; every finding requires manual review and links the immutable pinned [`createComputed` replacement guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#createcomputed--creatememo-createeffect-or-derived-createsignal).
- **`createEffect` compute/apply split** — direct non-spread one-argument `createEffect(...)` calls reached through the exact named `solid-js` binding; every finding requires manual review and links the immutable [effects, lifecycle, and cleanup guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup).
- **`createMemo` initial-value migration** — direct non-spread two- and three-argument `createMemo(...)` calls reached through the exact named `solid-js` binding; every finding requires manual review and links the immutable [effects, lifecycle, and cleanup guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup).
- **`mergeProps` source-precedence migration** — every direct `mergeProps(...)` call reached through the exact unaliased named `solid-js` binding, including one-argument and spread-source calls; every finding requires manual review and links the immutable pinned [`mergeProps` / `splitProps` → `merge` / `omit` guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#mergeprops--splitprops--merge--omit).
- **`splitProps` tuple migration** — direct non-spread `splitProps(...)` calls with a source and at least one key group, reached through the exact unaliased named `solid-js` binding; every finding requires manual review and links the immutable pinned [`mergeProps` / `splitProps` → `merge` / `omit` guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#mergeprops--splitprops--merge--omit).
- **`onMount` lifecycle migration** — direct non-spread one-argument `onMount(...)` calls reached through the exact named `solid-js` binding; every finding requires manual review and links the immutable [effects, lifecycle, and cleanup guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup).
- **`unwrap` snapshot migration** — direct non-spread one-argument `unwrap(...)` calls reached through the exact unaliased named `solid-js/store` binding; every finding requires manual review and links the immutable pinned [`unwrap(store)` → `snapshot(store)` guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#unwrapstore--snapshotstore).
- **`produce` wrapper migration** — direct non-spread one-argument `produce(...)` calls reached through the exact named `solid-js/store` binding, including nested wrappers; every finding requires manual review and links the immutable pinned [`produce` draft-first setter guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#produce--now-the-default-setter-behavior).
- **`createMutable` / `modifyMutable` store migration** — direct non-spread `createMutable(...)` calls with one or two arguments and `modifyMutable(...)` calls with exactly two arguments, reached through the exact unaliased named `solid-js/store` binding; every finding requires manual review and links the immutable pinned [`createMutable` / `modifyMutable` → `createStore` with draft setters guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#createmutable--modifymutable--createstore-with-draft-setters).

Each message explains why the site matters, what nearby behavior to inspect, a possible migration direction, and conditions under which an agent or developer should stop rather than guess.

## Version evidence

- Solid 1.9.14 [`createComputed` accepts one to three arguments](https://app.unpkg.com/solid-js@1.9.14/files/types/reactive/signal.d.ts), while the pinned target [removes it](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/packages/solid/src/index.ts#L138-L156). The [official migration guide](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L716-L755) discusses `createMemo`, split `createEffect`, and function-form `createSignal`; the pinned [derived-ownership guidance](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/02-signals-derived-ownership.md#L146-L165) also shows derived `createStore`, depending on intent.
- Solid 2 exposes [`merge`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/packages/solid-signals/src/store/utils.ts#L267-L368) as the user-facing replacement for `mergeProps`. Its right-most source wins when a property exists even when its value is `undefined`; zero- and one-source behavior, source identity, and mutation can also make a blind rename unsafe.
- Solid 1.9.14 [`createMemo` uses its second argument as an initial value and its third as options](https://unpkg.com/solid-js@1.9.14/types/reactive/signal.d.ts), while Solid 2 [`createMemo` accepts options as its second argument and has no initial-value position](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/packages/solid/src/client/hydration.ts#L943-L1008).
- The pinned target [removes `onMount` in favor of `onSettled`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/packages/solid/src/index.ts#L156); [`onSettled` callbacks may return an owner-bound cleanup function](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/packages/solid-signals/src/signals.ts#L823-L838).
- The beta.32 migration guide defines the supported [subpath and JSX type ownership moves](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L21-L98), including the renderer-owned JSX runtime entries.
- The same pinned guide documents [`unwrap` to `snapshot` and `splitProps` to `omit`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L383-L425) plus the draft-first replacements for [`produce`, `createMutable`, and `modifyMutable`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L855-L900).
- JSX coverage follows the pinned component guidance for [`Suspense`/`ErrorBoundary`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L287-L328), [`Index`/`SuspenseList`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L451-L549), and [`classList`](https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#L618-L626).

## Architecture

The production workflow contains only two scripts:

```text
scripts/analyze.ts  # run every registered analyzer and aggregate guidance
scripts/emit.ts     # sort and print the complete aggregate once
```

Rule modules are grouped by domain under `rules/`. Shared direct-import resolution, guidance formatting, and deterministic ordering live under `shared/`. The package executable defaults to the current directory, validates an optional `--target`, and uses the pinned package-local Codemod runtime to invoke the single workflow noninteractively with analytics disabled.

Each rule has its own folder under its domain, with the production module, matching detection-only assertion adapter, and direct `*.fixture.tsx` sources colocated in that folder. Each adapter executes every colocated fixture case in dry-run mode and verifies the target file's SHA-256 hash is unchanged. Legacy `__testfixtures__`, `input.tsx`, and `expected.tsx` layouts are forbidden. Production end-to-end workflow tests separately copy whole project fixtures to a temporary directory and prove analyzer runs leave the entire tree byte-for-byte unchanged.

## Deliberate limits

Current coverage is deliberately limited: the analyzer does not cover indirect calls, shadowed bindings, unsupported argument counts, re-exports, dynamic imports, `require`, TypeScript `import()` type expressions, configuration, dependencies, SSR, libraries, monorepos, or cross-file intent. Binding-sensitive call and JSX rules also exclude aliased and namespace bindings. No guidance—or a clean run—is not a readiness result and does not imply complete Solid 2 migration coverage.

Automated transforms are roadmap-only. This package exposes no transform command, workflow, test, or implementation.

## Verify

From the workspace root:

```sh
pnpm verify
```

Verification checks detection-only architecture, comprehensive rule boundaries, exact and repeatable terminal output, fixture immutability, TypeScript types, and workflow schema validity.
