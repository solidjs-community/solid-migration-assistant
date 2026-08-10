# Solid Migration Assistant

This package implements Solid Migration Assistant as a single read-only workflow for a narrow Solid 1.9 client-application profile. It scans TSX files and prints one detailed, location-bearing guidance string per supported migration site. The workflow returns no edits and writes no files.

The migration target is pinned to Solid `2.0.0-beta.32` at upstream commit [`3194631`](https://github.com/solidjs/solid/tree/3194631aeeb2b2e360817dc887ab5cbce7548359).

## Analyze with npm

> **Beta scope:** version `0.1.0` targets Solid `2.0.0-beta.32`, analyzes TSX only, and implements only the detections documented below. A clean run is not proof that a project is ready for Solid 2.

After npm publication, run this from the project root with Node 20 or newer and npm (pnpm is not required):

Runtime platform support is limited by the native binaries published for the pinned Codemod 1.12.13 dependency: macOS x64 and arm64, glibc Linux x64 and arm64, and Windows x64. Alpine/musl Linux and Windows ARM64 are not supported.

```sh
npx --yes solid-migration-assistant@latest
```

The current directory is the default target. An explicit target may be absolute or relative to the current directory:

```sh
npx --yes solid-migration-assistant@latest --target /path/to/a/solid-project
```

A run with detections exits successfully. Guidance is deduplicated, sorted by file, line, column, and rule ID, and printed once as a terminal aggregate. The analyzer does not edit the target, create persistent output, or send Codemod analytics. Codemod runtime state is confined to a private per-run home/config/cache/temp sandbox and recursively removed after the child process exits.

## Supported detections

- **`S2-IMPORT-WEB-001`** — static ES imports whose module source is exactly `solid-js/web`.
- **`S2-IMPORT-BETA32-001`** — static imports from the legacy store, hyperscript, HTML, universal-renderer, and JSX runtime subpaths documented by Solid 2 beta.32.
- **`S2-JSX-COMPONENT-001`** — binding-resolved JSX uses of unaliased `Suspense`, `ErrorBoundary`, `SuspenseList`, and `Index` imports from `solid-js`.
- **`S2-JSX-CLASSLIST-001`** — direct JSX `classList` attributes.
- **`S2-COMPUTED-001`** — supported direct, non-spread `createComputed(...)` calls reached through the exact named `solid-js` binding.
- **`S2-EFFECT-001`** — direct one-argument `createEffect(...)` calls reached through the exact named binding.
- **`S2-MEMO-001`** — direct two- and three-argument `createMemo(...)` calls reached through the exact named binding.
- **`S2-PROPS-001`** — direct `mergeProps(...)` calls reached through the exact named binding.
- **`S2-PROPS-SPLIT-001`** — supported direct `splitProps(...)` calls reached through the exact named `solid-js` binding.
- **`S2-LIFECYCLE-001`** — direct one-argument `onMount(...)` calls reached through the exact named binding.
- **`S2-STORE-UNWRAP-001`** — supported direct `unwrap(...)` calls from `solid-js/store`.
- **`S2-STORE-PRODUCE-001`** — supported direct `produce(...)` wrapper calls from `solid-js/store`.
- **`S2-STORE-CREATE-MUTABLE-001`** and **`S2-STORE-MODIFY-MUTABLE-001`** — supported direct legacy mutable-store calls.

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

Current coverage is deliberately limited: the analyzer does not cover JavaScript, `.ts` files, indirect calls, shadowed bindings, unsupported argument counts, re-exports, dynamic imports, `require`, TypeScript `import()` type expressions, configuration, dependencies, SSR, libraries, monorepos, or cross-file intent. Binding-sensitive call and JSX rules also exclude aliased and namespace bindings. No guidance—or a clean run—is not a readiness result and does not imply complete Solid 2 migration coverage.

Automated transforms are roadmap-only. This package exposes no transform command, workflow, test, or implementation.

## Verify

From the workspace root:

```sh
pnpm verify
```

Verification checks detection-only architecture, comprehensive rule boundaries, exact and repeatable terminal output, fixture immutability, TypeScript types, and workflow schema validity.
