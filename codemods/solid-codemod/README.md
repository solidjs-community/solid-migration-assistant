# solid-codemod

Migrate local-safe Solid 1.x patterns to Solid 2.

This codemod intentionally focuses on changes that can be determined from local syntax. It rewrites documented package/import moves, safe symbol renames, several local JSX shape changes, and JSON config/package entries. It leaves semantic migrations as review markers because effect splitting, async data, store setter rewrites, and transition behavior require application intent.

## Installation

```bash
# Install from registry
codemod run solid-codemod

# Or run locally
codemod run -w workflow.yaml
```

## Usage

Run a dry run before applying to a real project:

```bash
codemod run -w workflow.yaml --dry-run
codemod run -w workflow.yaml
```

## Automated Changes

- Import paths: `solid-js/web` to `@solidjs/web`, `solid-js/store` to `solid-js`, `solid-js/h` to `@solidjs/h`, `solid-js/html` to `@solidjs/html`, `solid-js/universal` to `@solidjs/universal`, and JSX runtime entries to `@solidjs/web`.
- Renderer-owned JSX types: type-only `JSX` and `ComponentProps` imports move from `solid-js` to `@solidjs/web`.
- Safe symbol renames: `Suspense` to `Loading`, `SuspenseList` to `Reveal`, `ErrorBoundary` to `Errored`, `Index` to `For`, `mergeProps` to `merge`, `unwrap` to `snapshot`, `onMount` to `onSettled`, `equalFn` to `isEqual`, and `getListener` to `getObserver`.
- JSX shape changes: `<Index>` becomes `<For keyed={false}>`, `SuspenseList revealOrder="forwards"` is removed because `Reveal` defaults to sequential ordering, `revealOrder="together"` becomes `order="together"`, `tail="collapsed"` becomes `collapsed`, `Context.Provider` becomes the context component when the context is locally created with `createContext(...)`, and simple `classList` attributes become Solid 2 `class` object/array values.
- JSON config/package changes: `jsxImportSource: "solid-js"` becomes `"@solidjs/web"`; `package.json` dependency groups with `solid-js` move `solid-js` and `@solidjs/web` to the Solid 2 prerelease range.

## Manual Review Markers

The codemod adds `TODO(solid-2): Review semantic migration sites...` when it sees APIs that require intent-aware migration. These include `createResource`, `createEffect(on(...))`, `createComputed`, `splitProps`, `produce`, `batch`, transitions, error handlers, mutable stores, and observable helpers.

Use the Solid 2 migration guide and real tests to migrate these sites. Brenelz's migration notes are especially useful for review heuristics:

- [Things Learned Migrating To Solid 2.0](https://www.brenelz.com/posts/migrating-to-solid-2)
- [Learning Solid 2.0](https://www.brenelz.com/posts/learning-solid2)
- [Handling Errors in Solid 2.0](https://www.brenelz.com/posts/handling-errors-in-solid-2)
- [How My Mental Model of `isPending` Changed](https://www.brenelz.com/posts/is-pending-mental-model)

## Limits

- `use:` directives are not rewritten because the current TSX parser treats directive syntax as an error shape. Replace them manually with `ref` directive factories.
- `splitProps` is only flagged, not rewritten to `omit`, because the return shape changes from tuple split values to a single omitted view.
- `createEffect`, `createMemo`, `createResource`, store path setters, `batch`, actions, optimistic state, and top-level reactive-read changes are semantic migrations and require test-backed review.
- The source transform uses the TSX parser for JS/TS/JSX/TSX files so JSX-aware rewrites can run in one pass.

## Development

```bash
# Test the transformation
pnpm test

# Typecheck transform code
pnpm check-types

# Validate the workflow
codemod workflow validate -w workflow.yaml

# Publish to registry
codemod login
codemod publish
```

## License

MIT

## Skill Installation

```bash
pnpm dlx codemod@latest solid-codemod
```
