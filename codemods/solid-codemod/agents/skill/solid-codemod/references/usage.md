# Usage

This package migrates local-safe Solid 1.x syntax to Solid 2 and flags semantic migration sites for human review.

Suggested flow:

1. Run `codemod run -w workflow.yaml --dry-run` and inspect the diff.
2. Apply the workflow when the import, JSX, and JSON config changes look correct.
3. Search for `TODO(solid-2)` markers.
4. Use the Solid 2 migration guide and Brenelz's posts to migrate semantic sites with project tests in the loop.

Automated changes include package import moves, renderer-owned JSX type imports, safe API renames, `<Index>` to `<For keyed={false}>`, `SuspenseList` to `Reveal`, local `Context.Provider` tags, simple `classList`, `jsxImportSource`, and `@solidjs/web` package entries.

Do not blindly rewrite `createEffect`, `createResource`, `batch`, store setters, `splitProps`, `use:` directives, or optimistic/action flows. These require application intent and regression tests.
