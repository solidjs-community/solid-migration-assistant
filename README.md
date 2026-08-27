# Solid Migration Assistant

Solid Migration Assistant is an experimental Solid 1.9 → Solid 2 migration assistant targeting Solid `2.0.0-rc.0`. It ships two workflows: a read-only `analyze` workflow that prints guidance for supported migration sites, and a deterministic `transform` workflow that relocates a small, pure subset of legacy import subpaths.

The assistant scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Guidance is sorted deterministically and printed to standard output; the Codemod runtime's progress lines and the final disclosure are written to standard error. The analyzer never edits the target and generates no artifact unless `--report FILE` is explicitly supplied. Codemod analytics are disabled. Codemod may persist workflow and task state in normal platform user-data directories outside the target; the assistant does not redirect or remove that runtime state.

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

To keep the same terminal guidance and also write the selected-rule pilot dashboard:

```sh
npx --yes solid-migration-assistant@latest --target . --report migration-report.html
```

The portable HTML covers `web-import`, `component-renames`, `create-effect`, and read-only legacy-subpath relocation previews. It contains the full matched source line range plus one complete context line before and after every finding. Treat it as project source. Existing files are refused unless `--force` is explicit; browsers open only with `--open`.

The supported rules detect the complete Solid 2 RC migration quick rename / removal map:

**Imports** — `solid-js/web`, store, renderer, and JSX-runtime subpath repackaging.
**JSX** — component renames (`Suspense`/`Loading`, `ErrorBoundary`/`Errored`, `Index`/`For keyed=false`, `SuspenseList`/`Reveal`), `classList` removal, DOM attribute/event namespace removal (`attr:`, `bool:`, `on:`, `oncapture:`), `use:` directive removal, and `Context.Provider` → direct context syntax.
**Reactivity & lifecycle** — `createComputed`, `createEffect`, `createMemo`, `batch`, `createResource`, `on`, `onError`/`catchError`/`resetErrorBoundaries`, `startTransition`/`useTransition`/`createDeferred`, `createSelector`/`indexArray`, `createDynamic`/`from`/`observable`, and `equalFn`/`getListener`/`writeSignal`/`enableScheduling`.
**Props & store** — `mergeProps`/`splitProps`, `onMount`, `unwrap`, `produce`, and `createMutable`/`modifyMutable`.
Coverage is deliberately limited. Even when no guidance is printed, review the documented exclusions and perform the application's normal type, build, and behavior validation; a clean analyzer run is not a readiness result.

## Transform

The opt-in `transform` workflow rewrites exactly five pure legacy Solid import subpaths in place and changes nothing else:

- `solid-js/h` → `@solidjs/h`
- `solid-js/html` → `@solidjs/html`
- `solid-js/universal` → `@solidjs/universal`
- `solid-js/jsx-runtime` → `@solidjs/web/jsx-runtime`
- `solid-js/jsx-dev-runtime` → `@solidjs/web/jsx-dev-runtime`

It covers static imports, re-exports, dynamic `import()`, and `require()` calls; preserves each reference's import form and quote style; and emits one per-edit report line (`file:line:column`, old → new, plus the migration-guide link). Every move is a pure package relocation with no removed, renamed, or behaviorally changed export, so no binding-level review is required for these five paths. The workflow is idempotent and writes no report files or other artifacts in the target. It deliberately leaves `solid-js/web`, `solid-js/store`, already-migrated paths, and near-miss subpaths such as `solid-js/h-extra` and `vendor/solid-js/h` untouched.

In this repository, run `pnpm transform` against the current directory, or invoke the Codemod CLI directly to target another directory:

```sh
node ./node_modules/codemod/codemod --disable-analytics workflow run -w transform.yaml -t /path/to/a/solid-project --allow-dirty --no-interactive
```

After publication, select the `transform` workflow from the Codemod platform (it is registered with `default: false`).

## Verify the repository

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification runs comprehensive analysis and transformation rule fixtures plus end-to-end analyzer and transform fixtures; it checks exact ordered guidance, proves the analyzer leaves every target file unchanged, and proves the transform is idempotent and changes nothing outside the five relocated module strings.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Broader automated migrations remain a possible future roadmap item. The project is licensed under the [MIT License](LICENSE).
