# Solid Migration Assistant

This package implements Solid Migration Assistant as two workflows for a narrow Solid 1.9 client-application profile. The read-only `analyze` workflow scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source files and prints one detailed, location-bearing guidance string per supported migration site; it returns no edits and writes no files. The `transform` workflow deterministically relocates a small, pure subset of legacy import subpaths.

The migration target is pinned to Solid `2.0.0-rc.0` at upstream commit [`ff4d3c44`](https://github.com/solidjs/solid/tree/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5).

## Analyze with npm

> **RC scope:** version `0.3.0` targets Solid `2.0.0-rc.0` and implements only the detections and relocations documented below. A clean run is not proof that a project is ready for Solid 2.

After npm publication, run this from the project root with Node 20 or newer and npm (pnpm is not required):

The assistant itself imposes no operating-system, CPU-architecture, or libc restriction in its npm metadata or launcher. Actual execution support depends on native runtime availability from the pinned Codemod 1.12.13 dependency and on the installing package manager and platform. This project does not claim that Codemod provides a working native runtime for every platform or architecture; installation or launch errors from Codemod remain authoritative.

```sh
npx --yes solid-migration-assistant@latest
```

The current directory is the default target. An explicit target may be absolute or relative to the current directory:

```sh
npx --yes solid-migration-assistant@latest --target /path/to/a/solid-project
```

A run with detections exits successfully. Complete opaque guidance strings are exact-deduplicated, sorted lexically as whole strings, and printed once to standard output as a terminal aggregate. The Codemod runtime's progress lines and the final disclosure are written to standard error. To capture the findings in a file, redirect standard output: `npx --yes solid-migration-assistant@latest --target . > report.txt`; to also capture progress and the disclosure, redirect both streams: `npx --yes solid-migration-assistant@latest --target . > report.txt 2>&1`. The analyzer does not edit the target or create persistent output there, and Codemod analytics are disabled. Codemod may persist workflow and task state in normal platform user-data directories outside the target; the assistant does not redirect or remove that runtime state.

## Supported detections

### Imports
- **Solid web package imports** — static ES imports from `solid-js/web` → `@solidjs/web`.
- **Remaining Solid import subpaths** — `solid-js/store`, `/h`, `/html`, `/universal`, `/jsx-runtime`, `/jsx-dev-runtime` → new package locations.

### JSX
- **JSX component migrations** — binding-resolved JSX uses of `Suspense`, `ErrorBoundary`, `SuspenseList`, `Index` imports from `solid-js`.
- **JSX `classList` migration** — `classList` attributes on intrinsic JSX elements → `class` object/array forms.
- **DOM attribute namespaces** — `attr:` and `bool:` prefixed JSX attributes → standard HTML attributes.
- **DOM event namespaces** — `on:` and `oncapture:` prefixed JSX attributes → camelCase event handlers or ref callbacks.
- **`use:` directives** — Solid 1.x directive syntax → `ref` directive factories.
- **`Context.Provider` JSX sites** — `<Context.Provider value={...}>` → `<Context value={...}>`.

### Reactivity
- **`createComputed`** — removed; choose `createMemo`, `createEffect`, or derived `createSignal`.
- **`createEffect` compute/apply split** — one-argument calls must split into compute and apply callbacks.
- **`createMemo` initial-value migration** — second argument treated as initial value in 1.x, as options in 2.0.
- **`batch`** — removed; default microtask batching, use `flush()` sparingly.
- **`createResource`** — removed; replace with async computations and `Loading` boundaries.
- **`on` helper** — removed; explicit dependency tracking unnecessary with split effects.
- **`onError` / `catchError` / `resetErrorBoundaries`** — removed; use `Errored` boundaries.
- **`startTransition` / `useTransition` / `createDeferred`** — removed; use built-in transitions + `isPending`.
- **`createSelector` / `indexArray`** — replaced by `createProjection` / `mapArray keyed: false`.
- **`createDynamic` / `from` / `observable`** — replaced by `dynamic(source)` factory / async iterators.
- **`equalFn` / `getListener` / `writeSignal` / `enableScheduling`** — renamed (`isEqual`, `getObserver`) or removed.

### Lifecycle & props
- **`onMount`** — removed; closest replacement is `onSettled`.
- **`mergeProps`** — replaced by `merge` with reviewed undefined-value semantics.
- **`splitProps`** — replaced by `omit` with reviewed key-group restructuring.

### Store
- **`unwrap(store)`** → `snapshot(store)` for point-in-time non-reactive capture.
- **`produce`** — removed; draft-first setters are now the default.
- **`createMutable` / `modifyMutable`** — removed; use `createStore` with draft setters.

Every finding links the immutable pinned [RC migration guide](https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md). Coverage follows the guide's complete quick rename / removal map.

## Transform

The opt-in `transform` workflow relocates exactly five pure legacy Solid import subpaths and changes nothing else:

- `solid-js/h` → `@solidjs/h`
- `solid-js/html` → `@solidjs/html`
- `solid-js/universal` → `@solidjs/universal`
- `solid-js/jsx-runtime` → `@solidjs/web/jsx-runtime`
- `solid-js/jsx-dev-runtime` → `@solidjs/web/jsx-dev-runtime`

The transform covers static imports, re-exports, dynamic `import()`, and `require()` calls; preserves each reference's import form and quote style; and emits one per-edit report line (`file:line:column`, old → new, plus the migration-guide link). Every move is a pure package relocation with no removed, renamed, or behaviorally changed export, so the rewrite is safe without binding-level review. The workflow is idempotent and writes no report files or other artifacts in the target. It deliberately leaves `solid-js/web`, `solid-js/store`, already-migrated paths, and near-miss subpaths such as `solid-js/h-extra` and `vendor/solid-js/h` untouched.

In this repository, run `pnpm transform` against the current directory, or invoke the Codemod CLI directly to target another directory:

```sh
node ./node_modules/codemod/codemod --disable-analytics workflow run -w transform.yaml -t /path/to/a/solid-project --allow-dirty --no-interactive
```

After publication, select the `transform` workflow from the Codemod platform (it is registered with `default: false`).

## Deliberate limits

Current coverage is deliberately limited: the analyzer does not cover indirect calls, shadowed bindings, unsupported argument counts, re-exports, dynamic imports, `require`, TypeScript `import()` type expressions, configuration, dependencies, SSR, libraries, monorepos, or cross-file intent. Binding-sensitive call and JSX rules also exclude aliased and namespace bindings. No guidance—or a clean run—is not a readiness result and does not imply complete Solid 2 migration coverage.

The read-only `analyze` workflow remains detection-only. Broader automated transforms remain roadmap items beyond the five pure import-path relocations implemented by the `transform` workflow.

## Verify

From the workspace root:

```sh
pnpm verify
```

Verification checks the two-workflow architecture, comprehensive analysis and transformation rule boundaries, exact and repeatable terminal output, analyzer fixture immutability, transform idempotency, TypeScript types, and workflow schema validity.
