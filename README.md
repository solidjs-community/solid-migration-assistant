# Solid Migration Assistant

Solid Migration Assistant is an experimental Solid 1.9 → Solid 2 migration assistant targeting Solid `2.0.0-rc.0`. It ships two TypeScript workflows: a read-only `analyze` workflow that prints guidance for supported migration sites, and a deterministic `transform` workflow that relocates a small, pure subset of legacy import subpaths, relocates `solid-js/web` statements whose complete named binding set is proven compatible, and renames the provably equivalent subset of intrinsic JSX `classList` attributes to `class`.

The assistant scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Each of the 37 named analyzers is its own inline JSSG definition in `workflows/analyze.ts` and its own workspace-semantic command; because the analyzers only read the target, all 37 are declared as one parallel group, and the engine's weighted admission scheduler decides how many of them run at once. The workflow modules are the only production composition layer. Guidance is returned by each command as structured per-file output, then flattened, deduplicated, sorted deterministically, and printed to standard output; the final disclosure is written to standard error. The analyzer never edits the target and does not generate reports, dashboards, or other output there. No telemetry exists in this runtime, workflow history stays in memory, and each command's exchange with the execution bridge goes through a private temporary directory that is removed afterwards.

## Run the RC analyzer and transform

> **RC scope:** version `0.3.0` targets Solid `2.0.0-rc.0` and covers only the detections and relocations documented below. A clean analyzer run is not proof that a project is ready for Solid 2.

The workflows run on `@codemod.com/orchestration`, the TypeScript orchestration prototype in the Codemod monorepo, which is private and unpublished, and on its Rust execution bridge, which is not distributed. This repository links the prototype from a sibling checkout (`"@codemod.com/orchestration": "link:../../../codemod/packages/orchestration"` in the package manifest, that is `../codemod` beside this repository on its `prototype/typescript-orchestration` branch) and resolves the bridge at that checkout's `target/debug/butterflow-execution-bridge`; `CODEMOD_BRIDGE_BIN` overrides that path. Node 24 or newer is required.

```sh
# beside this repository
git clone https://github.com/codemod/codemod ../codemod
git -C ../codemod switch prototype/typescript-orchestration
(cd ../codemod && pnpm install && cargo build -p butterflow-execution-bridge)

# in this repository
pnpm install --frozen-lockfile
pnpm analyze -- --target /path/to/a/solid-project
```

The current directory is analyzed by default; `--target` selects another directory, absolute or relative to the current one.

**Publication blocker:** this version is not publishable. `npx solid-migration-assistant` cannot work until `@codemod.com/orchestration` is published and the bridge binary ships with it or as a `codemod` subcommand, because a registry install cannot resolve the `link:` dependency. Do not publish this version.

The supported rules detect the complete Solid 2 RC migration quick rename / removal map:

**Imports** — `solid-js/web`, store, renderer, and JSX-runtime subpath repackaging.
**JSX** — component renames (`Suspense`/`Loading`, `ErrorBoundary`/`Errored`, `Index`/`For keyed=false`, `SuspenseList`/`Reveal`), `classList` removal, DOM attribute/event namespace removal (`attr:`, `bool:`, `on:`, `oncapture:`), `use:` directive removal, and `Context.Provider` → direct context syntax.
**Reactivity & lifecycle** — `createComputed`, `createEffect`, `createMemo`, `batch`, `createResource`, `on`, `onError`/`catchError`/`resetErrorBoundaries`, `startTransition`/`useTransition`/`createDeferred`, `createSelector`/`indexArray`, `createDynamic`/`from`/`observable`, and `equalFn`/`getListener`/`writeSignal`/`enableScheduling`.
**Props & store** — `mergeProps`/`splitProps`, `onMount`, `unwrap`, `produce`, and `createMutable`/`modifyMutable`.
Coverage is deliberately limited. Even when no guidance is printed, review the documented exclusions and perform the application's normal type, build, and behavior validation; a clean analyzer run is not a readiness result.

## Transform

The opt-in `transform` workflow applies three deterministic rewrites in place and changes nothing else. Each rule is a separate inline JSSG definition in `workflows/transform.ts`, awaited as its own command one at a time, so later rules see the output of earlier rules; unlike the read-only analyzers these mutate the target, so they are deliberately not declared as an overlapping group. The current rules operate on disjoint syntax, and the combined workflow remains covered by exact-output and idempotency tests.

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

All three rules emit one per-edit report line (`file:line:column`, what changed, plus the migration-guide link) to standard output. The workflow is idempotent and writes no report files or other artifacts in the target. It deliberately leaves `solid-js/store`, already-migrated paths, and near-miss subpaths such as `solid-js/h-extra`, `vendor/solid-js/h`, and `solid-js/web/storage` untouched.

In this repository, run the transform against the current directory or another target:

```sh
pnpm --dir codemods/solid-migration-assistant transform
pnpm --dir codemods/solid-migration-assistant transform -- --target /path/to/a/solid-project
```

## Preliminary workspace-pass benchmark

Run the opt-in directional benchmark on the small checked-in fixture:

```sh
pnpm --dir codemods/solid-migration-assistant benchmark:workspace-passes
```

Pass `-- --target /path/to/project` to use another target. It generates temporary workflow modules whose inline definitions mirror the production analyzers, including declaring them as one parallel group, and compares one workspace-semantic command against the same command repeated to match the production analyzer count, then reports raw samples, medians, added cost, slowdown, a marginal-command estimate, and the host's admission capacity. Both modes are scheduled groups, so the added cost describes bounded parallel commands on the measuring host rather than a serial sum. Each command forces reference resolution for one imported binding per source file, and relevant target source is hashed before and after. Each sample times one in-process workflow run, so Node startup is excluded while each command's bridge process startup, workspace indexing, and per-file sandbox runtime are included. The probe does not reproduce the number or shape of semantic queries made by the real analyzers, compare complete old and new analyzer workflows, control caches, or model full rule traversal cost.

## Verify the repository

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification runs comprehensive analysis and transformation rule fixtures plus end-to-end analyzer and transform fixtures through the launcher; it checks exact ordered guidance, cross-file semantic resolution, the analyzer group's declaration as one parallel group whose aggregate survives out-of-order completion, the admission bound on concurrent bridge processes, launcher failure and cancellation behavior, proves the analyzer leaves every target file unchanged, proves the transform is idempotent and changes nothing outside the relocated module strings and the qualifying `classList` attribute names, checks the packed file list, and typechecks both the sandbox-side and workflow-side programs. It needs the sibling codemod checkout and a built bridge, as described above.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Broader automated migrations remain a possible future roadmap item. The project is licensed under the [MIT License](LICENSE).
