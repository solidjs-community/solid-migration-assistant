# Solid Migration Assistant

Solid Migration Assistant is an experimental, read-only analyzer for selected Solid 1.9 migration sites targeting Solid `2.0.0-rc.0`.

The assistant scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Guidance is sorted deterministically and printed to standard output; the Codemod runtime's progress lines and the final disclosure are written to standard error. The analyzer never edits the target and does not generate reports, dashboards, or other output there. Codemod analytics are disabled. Codemod may persist workflow and task state in normal platform user-data directories outside the target; the assistant does not redirect or remove that runtime state.

## Run the RC analyzer

> **RC scope:** this `0.2.0` analyzer targets Solid `2.0.0-rc.0`, scans project-owned `.js`, `.jsx`, `.ts`, and `.tsx` source, and covers only the detections listed below. A clean run is not proof that a project is ready for Solid 2.

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

## Verify the repository

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification runs comprehensive rule fixtures and an end-to-end project fixture, checks exact ordered guidance across repeated runs, and proves analysis leaves every target file unchanged.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Automated migrations are a possible future roadmap item; this preview ships no executable transforms. The project is licensed under the [MIT License](LICENSE).
