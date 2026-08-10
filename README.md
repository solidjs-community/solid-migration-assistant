# Solid Migration Assistant

Solid Migration Assistant is an experimental, read-only analyzer for selected Solid 1.9 migration sites targeting Solid `2.0.0-beta.32`.

The assistant scans TSX source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Guidance is sorted deterministically and printed only in the terminal. The analyzer never edits the target and does not generate reports, dashboards, telemetry, or other persistent artifacts.

## Run it

The public repository is currently unannounced, and hands-on preview testing is invitation-only.

```sh
pnpm install --frozen-lockfile
pnpm analyze --target /absolute/path/to/a/solid-project
```

The supported rules detect:

- legacy static Solid subpath imports, including `solid-js/web`, store, renderer, and JSX runtime paths;
- direct legacy reactivity and lifecycle calls such as `createComputed(...)`, one-argument `createEffect(...)`, seeded `createMemo(...)`, and `onMount(...)`;
- direct `mergeProps(...)` and `splitProps(...)` calls;
- direct legacy store calls using `unwrap`, `produce`, `createMutable`, or `modifyMutable`;
- imported `Suspense`, `ErrorBoundary`, `SuspenseList`, and `Index` JSX sites; and
- JSX `classList` attributes.

A clean run is not proof that an application is ready for Solid 2. Review every detection and its stop conditions before changing code.

## Verify the repository

```sh
pnpm verify
```

Verification runs comprehensive rule fixtures and an end-to-end project fixture, checks exact ordered guidance across repeated runs, and proves analysis leaves every target file unchanged.

See [`codemods/solid-migration-assistant/README.md`](codemods/solid-migration-assistant/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-migration-assistant/issues/new).

Automated migrations are a possible future roadmap item; this preview ships no executable transforms. The project is licensed under the [MIT License](LICENSE).
