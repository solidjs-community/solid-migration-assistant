# Solid Migration Assistant

This package implements Solid Migration Assistant as two workflows for a narrow Solid 1.9 client-application profile. The read-only `analyze` workflow scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source files and prints one detailed, location-bearing guidance string per supported migration site; it returns no edits and writes no files. The `transform` workflow deterministically relocates a small, pure subset of legacy import subpaths, relocates `solid-js/web` statements whose complete named binding set is proven compatible, and rewrites the narrow, provably equivalent subset of intrinsic JSX `classList` attributes to `class`.

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

The opt-in `transform` workflow applies three deterministic rewrites and changes nothing else. All three run in one pass over each file, over disjoint syntax: two rewrite module source strings for disjoint specifier sets, and the third rewrites JSX attribute name nodes. Their edits are merged into one source-ordered list and proven non-overlapping before the file is written, so the result never depends on rule order. Each edit is reported on its own line (`file:line:column`, what changed, plus the migration-guide link). The workflow is idempotent and writes no report files or other artifacts in the target.

### Pure subpath relocations

Five subpaths move wholesale:

- `solid-js/h` → `@solidjs/h`
- `solid-js/html` → `@solidjs/html`
- `solid-js/universal` → `@solidjs/universal`
- `solid-js/jsx-runtime` → `@solidjs/web/jsx-runtime`
- `solid-js/jsx-dev-runtime` → `@solidjs/web/jsx-dev-runtime`

This rule covers static imports, re-exports, dynamic `import()`, and `require()` calls, and preserves each reference's import form and quote style. Every one of these moves is a pure package relocation with no removed, renamed, or behaviorally changed export, so the rewrite is safe without binding-level review.

### Binding-gated `solid-js/web` → `@solidjs/web`

`solid-js/web` is **not** a pure relocation. Its export surface changed between Solid 1.9.13 and 2.0.0-rc.7: `createDynamic`, `Index`, `SuspenseList`, `renderToStringAsync`, `ssrClassList`, and `pipeToNodeWritable` are gone; `Suspense`, `ErrorBoundary`, and `mergeProps` were renamed to `Loading`, `Errored`, and `merge`; `Portal` lost `useShadow`, `isSVG`, and `ref`; and `isDev` is no longer pinned to `false` on the server entry. A separate default-deny rule therefore relocates a `solid-js/web` statement only when it is a named static import or a named re-export **and** every name it takes from the module is on this allowlist of bindings proven identical across the move:

`Dynamic`, `hydrate`, `isServer`, `render`

Every other name is vetoed, so a statement that mixes an allowed name with a vetoed one is left entirely unchanged. Namespace imports, default imports, side-effect imports, empty name lists, `export *`, `export * as`, `export { default as … }`, dynamic `import()`, `require()`, `import("solid-js/web").X` type queries, string-literal specifier names, and import attributes are all rejected outright. Aliases, inline `type` modifiers, and quote style survive untouched, and an escaped specifier such as `"solid-js\x2fweb"` is the same module, so it is eligible once its bindings pass.

Because this rule owns `solid-js/web` exclusively, the pure-relocation map above never contains it, and no `solid-js/web` statement is ever rewritten on the strength of its module string alone.

This allowlist is the one place the project reads a later upstream commit than the pinned `ff4d3c44` guidance target: the names were compared against [`7f416cf7`](https://github.com/solidjs/solid/tree/7f416cf75dde3b89739d53b15305ac6c3c41355c) (where `packages/web` is `@solidjs/web` `2.0.0-rc.7`) on one side and the `v1.9.13` tag on the other, because the web entry's export surface is what has to be proven. Its report lines link that commit accordingly, so a `solid-js/web` line and a subpath line in the same run cite different commits by design. One caveat is recorded in the rule source: at `7f416cf7` the guide and the Babel plugin's auto-import defaults both prescribe `import { Dynamic } from "@solidjs/web"`, but no `Dynamic` export exists in the runtime source yet, so that entry rests on upstream's stated intent rather than a located export.

### Intrinsic JSX `classList` → `class`

Solid 2 removes the `classList` attribute and folds its behavior into `class`, which accepts a string, an object whose truthy keys are applied as class names, or an array of those. The runtime applies an object-valued `class` with the same per-key toggling, whitespace-key splitting, and falsy-key skipping that Solid 1.x applied for `classList`, and the compiler decomposes an inline `class={{ … }}` literal per property exactly as it decomposed `classList`. On an element whose only class source is one `classList` expression, renaming the attribute key is therefore an equivalence, so the transform rewrites:

```jsx
<div id="first" classList={flags} />   →   <div id="first" class={flags} />
```

Only the attribute name changes; the value expression, its comments, its whitespace, and every other attribute stay byte-identical. An element is rewritten only when it is intrinsic (a plain lowercase-initial element name), carries exactly one plainly named `classList` attribute, and gives that attribute an expression container holding exactly one expression.

Everything else is left to the analyzer's manual-review guidance, by design:

- components, member components (`Components.Widget`), and namespaced element names (`svg:circle`), which never reach the DOM class path;
- elements with any other class source — `class`, `className`, the same names under a namespace (`attr:class`, `prop:className`, `bool:class`), or a `class:` toggle — including the `class="card"` plus `classList={…}` merge into the array form, whose precedence between the static class and the object's keys is not settled by an upstream test;
- elements with a spread attribute anywhere, since a spread can supply or override `class` and its position decides precedence;
- duplicate `classList` attributes on one element;
- shorthand (`classList`), string (`classList="active"`), empty (`classList={}`), and comment-only values;
- near-miss and dynamic attribute names such as `ns:classList`, `class-list`, `classlist`, and `data-classList`; and
- any element whose attribute list does not parse cleanly.

The rewrite assumes Solid semantics for the scanned project, which is what the workflow is scoped to; it does not verify that a file imports Solid, because Solid JSX files frequently import nothing from `solid-js` directly.

### Shared limits

All three rules deliberately leave `solid-js/store`, already-migrated paths, and near-miss subpaths such as `solid-js/h-extra`, `vendor/solid-js/h`, and `solid-js/web/storage` untouched.

In this repository, run `pnpm transform` against the current directory, or invoke the Codemod CLI directly to target another directory:

```sh
node ./node_modules/codemod/codemod --disable-analytics workflow run -w transform.yaml -t /path/to/a/solid-project --allow-dirty --no-interactive
```

After publication, select the `transform` workflow from the Codemod platform (it is registered with `default: false`).

## Deliberate limits

Current coverage is deliberately limited: the analyzer does not cover indirect calls, shadowed bindings, unsupported argument counts, re-exports, dynamic imports, `require`, TypeScript `import()` type expressions, configuration, dependencies, SSR, libraries, monorepos, or cross-file intent. Binding-sensitive call and JSX rules also exclude aliased and namespace bindings. No guidance—or a clean run—is not a readiness result and does not imply complete Solid 2 migration coverage.

The read-only `analyze` workflow remains detection-only, including for every `solid-js/web` statement and every `classList` attribute the transform refuses. Broader automated transforms remain roadmap items beyond the five pure import-path relocations, the binding-gated `solid-js/web` relocation, and the intrinsic `classList` rename implemented by the `transform` workflow. Growing the `solid-js/web` allowlist requires fresh upstream evidence per name, not a blanket widening.

## Verify

From the workspace root:

```sh
pnpm verify
```

Verification checks the two-workflow architecture, comprehensive analysis and transformation rule boundaries, exact and repeatable terminal output, analyzer fixture immutability, transform idempotency, TypeScript types, and workflow schema validity.
