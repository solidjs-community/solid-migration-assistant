# Solid 2 migration analyzer

This repository contains an experimental, read-only analyzer for selected Solid 1.9 migration sites targeting Solid `2.0.0-beta.30`.

The analyzer scans TSX source, prints one detailed guidance string for each supported detection, and exits successfully when migration work is found. Guidance is sorted deterministically and printed only in the terminal. The analyzer never edits the target and does not generate reports, dashboards, telemetry, or other persistent artifacts.

## Run it

The public repository is currently unannounced, and hands-on preview testing is invitation-only.

```sh
pnpm install --frozen-lockfile
pnpm analyze --target /absolute/path/to/a/solid-project
```

The supported rules detect:

- static imports from `solid-js/web`;
- direct `createComputed(...)` calls;
- direct one-argument `createEffect(...)` calls;
- direct two- and three-argument `createMemo(...)` calls;
- direct `mergeProps(...)` calls; and
- direct one-argument `onMount(...)` calls.

A clean run is not proof that an application is ready for Solid 2. Review every detection and its stop conditions before changing code.

## Verify the repository

```sh
pnpm verify
```

Verification runs comprehensive rule fixtures and an end-to-end project fixture, checks exact ordered guidance across repeated runs, and proves analysis leaves every target file unchanged.

See [`TESTING.md`](TESTING.md) for the preview protocol and [`codemods/solid-codemod/README.md`](codemods/solid-codemod/README.md) for rule boundaries. Feedback is collected through ordinary [public GitHub issues](https://github.com/devagrawal09/solid-codemod/issues/new).

Automated migrations are a possible future roadmap item; this preview ships no executable transforms. The project is licensed under the [MIT License](LICENSE).
