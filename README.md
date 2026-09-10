# Solid Migration Assistant

Solid Migration Assistant is an experimental Solid 1.9 → Solid 2 migration assistant targeting Solid `2.0.0-rc.0`. It ships two workflows: a read-only `analyze` workflow that prints guidance for supported migration sites, and a deterministic `transform` workflow that relocates a small, pure subset of legacy import subpaths, relocates `solid-js/web` statements whose complete named binding set is proven compatible, and renames the provably equivalent subset of intrinsic JSX `classList` attributes to `class`.

The assistant scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Each of the 37 named analyzers is a separate JSSG entrypoint and sequential workflow step; the workflow is the only production composition layer. Guidance is accumulated across those steps, sorted deterministically, and printed to standard output; the Codemod runtime's progress lines and the final disclosure are written to standard error. The analyzer never edits the target and does not generate reports, dashboards, or other output there. Codemod analytics are disabled. Codemod may persist workflow and task state in normal platform user-data directories outside the target; the assistant does not redirect or remove that runtime state.

## Run the RC analyzer and transform

> **RC scope:** version `0.3.0` targets Solid `2.0.0-rc.0` and covers only the detections and relocations documented below. A clean analyzer run is not proof that a project is ready for Solid 2.

After npm publication, run the package from a project root with Node 20 or newer and npm (no pnpm installation is needed):

The assistant itself imposes no operating-system, CPU-architecture, or libc restriction in its npm metadata or launcher. Actual execution support depends on native runtime availability from the pinned Codemod 1.12.13 dependency and on the installing package manager and platform. This project does not claim that Codemod provides a working native runtime for every platform or architecture; installation or launch errors from Codemod remain authoritative.

```sh
npx --yes solid-migration-assistant@latest
```

The current directory is analyzed by default. To analyze another directory:

```sh
npx --yes solid-migration-assistant@latest --target /path/to/a/solid-project
```

The supported rules detect the complete Solid 2 RC migration quick rename / removal map:

**Imports** — `solid-js/web`, store, renderer, and JSX-runtime subpath repackaging.
**JSX** — component renames (`Suspense`/`Loading`, `ErrorBoundary`/`Errored`, `Index`/`For keyed=false`, `SuspenseList`/`Reveal`), `classList` removal, DOM attribute/event namespace removal (`attr:`, `bool:`, `on:`, `oncapture:`), `use:` directive removal, and `Context.Provider` → direct context syntax.
**Reactivity & lifecycle** — `createComputed`, `createEffect`, `createMemo`, `batch`, `createResource`, `on`, `onError`/`catchError`/`resetErrorBoundaries`, `startTransition`/`useTransition`/`createDeferred`, `createSelector`/`indexArray`, `createDynamic`/`from`/`observable`, and `equalFn`/`getListener`/`writeSignal`/`enableScheduling`.
**Props & store** — `mergeProps`/`splitProps`, `onMount`, `unwrap`, `produce`, and `createMutable`/`modifyMutable`.
Coverage is deliberately limited. Even when no guidance is printed, review the documented exclusions and perform the application's normal type, build, and behavior validation; a clean analyzer run is not a readiness result.

## Transform

The opt-in `transform` workflow applies three deterministic rewrites in place and changes nothing else. Each rule is a separate JSSG entrypoint and sequential workflow step, so later rules see the output of earlier rules. The current rules operate on disjoint syntax, and the combined workflow remains covered by exact-output and idempotency tests.

### Pure subpath relocations

Five subpaths move wholesale:

- `solid-js/h` → `@solidjs/h`
- `solid-js/html` → `@solidjs/html`
- `solid-js/universal` → `@solidjs/universal`
- `solid-js/jsx-runtime` → `@solidjs/web/jsx-runtime`
- `solid-js/jsx-dev-runtime` → `@solidjs/web/jsx-dev-runtime`

This rule covers static imports, re-exports, dynamic `import()`, and `require()` calls, and preserves each reference's import form and quote style. Every one of these moves is a pure package relocation with no removed, renamed, or behaviorally changed export, so no binding-level review is required for these five paths.

### Binding-gated `solid-js/web` → `@solidjs/web`

`solid-js/web` is **not** a pure relocation. Its export surface changed between Solid 1.9.13 and 2.0.0-rc.7: `createDynamic`, `Index`, `SuspenseList`, `renderToStringAsync`, `ssrClassList`, and `pipeToNodeWritable` are gone; `Suspense`, `ErrorBoundary`, and `mergeProps` were renamed to `Loading`, `Errored`, and `merge`; `Portal` lost `useShadow`, `isSVG`, and `ref`; and `isDev` is no longer pinned to `false` on the server entry. A separate default-deny rule therefore relocates a `solid-js/web` statement only when it is a named static import or a named re-export **and** every name it takes from the module is on this allowlist of bindings proven identical across the move:

`hydrate`, `isServer`, `render`

Every other name is vetoed, **including `Dynamic`**. Upstream prose and compiler configuration both point at `Dynamic`: the migration guide says `<Dynamic component={...}>` is user-facing unchanged and shows `import { Dynamic } from "@solidjs/web"` as the 2.0 form, and the Babel plugin auto-imports `Dynamic` from that same default module. But no `Dynamic` export exists in the rc.7 runtime source — the identifier does not appear anywhere under `packages/`. A guide describes intent and a compiler config describes an expectation; neither is a binding that can be proven compatible, which is what this list promises, and rewriting an import to a name the target package does not export would break the build it claims to migrate. `Dynamic` therefore stays vetoed until an actual exported implementation lands. The read-only analyzer still reports every such site for manual review.

A statement that mixes an allowed name with a vetoed one is left entirely unchanged. Namespace imports, default imports, side-effect imports, empty name lists, `export *`, `export * as`, `export { default as … }`, dynamic `import()`, `require()`, `import("solid-js/web").X` type queries, string-literal specifier names, and import attributes are all rejected outright. Aliases, inline `type` modifiers, and quote style survive untouched, and an escaped specifier such as `"solid-js\x2fweb"` is the same module, so it is eligible once its bindings pass.

Because this rule owns `solid-js/web` exclusively, the pure-subpath map above never contains it: a `solid-js/web` statement is relocated only after its bindings pass, never because its module string matched.

### Intrinsic JSX `classList` → `class`

The third rule renames `classList` to `class` on an intrinsic JSX element whose only class source is one `classList` expression — `<div id="first" classList={flags} />` becomes `<div id="first" class={flags} />` — changing only the attribute name and leaving the value expression byte-identical. Solid 2 folds `classList` into `class`, whose object form applies the same class tokens Solid 1.x applied, which makes that rename an equivalence. Every less certain case is left to the analyzer's manual-review guidance: components, member components, and namespaced element names; elements with any other class source (including the `class="card"` plus `classList={…}` merge into the array form); elements with a spread attribute; duplicate `classList` attributes; shorthand, string, empty, and comment-only values; and near-miss attribute names. See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for the full list.

All three rules emit one per-edit report line (`file:line:column`, what changed, plus the migration-guide link). The workflow is idempotent and writes no report files or other artifacts in the target. It deliberately leaves `solid-js/store`, already-migrated paths, and near-miss subpaths such as `solid-js/h-extra`, `vendor/solid-js/h`, and `solid-js/web/storage` untouched.

In this repository, run `pnpm transform` against the current directory, or invoke the Codemod CLI directly to target another directory:

```sh
node ./node_modules/codemod/codemod --disable-analytics workflow run -w transform.yaml -t /path/to/a/solid-project --allow-dirty --no-interactive
```

After publication, select the `transform` workflow from the Codemod platform (it is registered with `default: false`).

## Preliminary workspace-pass benchmark

Run the opt-in directional benchmark on the small checked-in fixture:

```sh
pnpm --dir codemods/solid-migration-assistant benchmark:workspace-passes
```

Pass `-- --target /path/to/project` to use another target. It compares one no-op JSSG workspace-semantic pass with the same pass repeated to match the production analyzer-step count, then reports medians, added cost, slowdown, and a marginal-pass estimate. It hashes relevant target source before and after. This is not a complete old-versus-new analyzer benchmark and does not control caches or model rule traversal cost.

## Verify the repository

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification runs comprehensive analysis and transformation rule fixtures plus end-to-end analyzer and transform fixtures; it checks exact ordered guidance, proves the analyzer leaves every target file unchanged, and proves the transform is idempotent and changes nothing outside the relocated module strings and the qualifying `classList` attribute names.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Broader automated migrations remain a possible future roadmap item. The project is licensed under the [MIT License](LICENSE).
