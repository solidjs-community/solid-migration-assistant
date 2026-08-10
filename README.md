# Solid Migration Assistant

Solid Migration Assistant is an experimental, read-only analyzer for selected Solid 1.9 migration sites targeting Solid `2.0.0-beta.32`.

The assistant scans TSX source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Guidance is sorted deterministically and printed only in the terminal. The analyzer never edits the target and does not generate reports, dashboards, telemetry, or other persistent artifacts. Codemod runtime state is confined to a private per-run home/config/cache/temp sandbox and removed after the child process exits.

## Run the beta analyzer

> **Beta scope:** this `0.1.0` analyzer targets Solid `2.0.0-beta.32`, scans TSX only, and covers only the detections listed below. A clean run is not proof that a project is ready for Solid 2.

After npm publication, run the package from a project root with Node 20 or newer and npm (no pnpm installation is needed):

Runtime platform support is limited to macOS x64 and arm64 and glibc Linux x64 and arm64. Windows x64 is temporarily unsupported because upstream Codemod 1.12.13 does not expose an isolatable state-directory override; Windows ARM64 is also unsupported and has no published native binary. Alpine/musl Linux is unsupported because 1.12.13 publishes only glibc Linux binaries. The packaged smoke test is currently exercised on macOS arm64; Linux support follows upstream native artifact metadata and is not yet physically smoke-tested by this project.

```sh
npx --yes solid-migration-assistant@latest
```

The current directory is analyzed by default. To analyze another directory:

```sh
npx --yes solid-migration-assistant@latest --target /path/to/a/solid-project
```

The supported rules detect:

- legacy static Solid subpath imports, including `solid-js/web`, store, renderer, and JSX runtime paths;
- direct legacy reactivity and lifecycle calls such as `createComputed(...)`, one-argument `createEffect(...)`, seeded `createMemo(...)`, and `onMount(...)`;
- direct `mergeProps(...)` and `splitProps(...)` calls;
- direct legacy store calls using `unwrap`, `produce`, `createMutable`, or `modifyMutable`;
- imported `Suspense`, `ErrorBoundary`, `SuspenseList`, and `Index` JSX sites; and
- JSX `classList` attributes.

Coverage is deliberately limited. Even when no guidance is printed, review the documented exclusions and perform the application's normal type, build, and behavior validation; a clean analyzer run is not a readiness result.

## Verify the repository

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification runs comprehensive rule fixtures and an end-to-end project fixture, checks exact ordered guidance across repeated runs, and proves analysis leaves every target file unchanged.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Automated migrations are a possible future roadmap item; this preview ships no executable transforms. The project is licensed under the [MIT License](LICENSE).
