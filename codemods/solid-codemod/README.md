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
- Types: `JSXElement` imports from `solid-js` become type-only `Element` imports from `solid-js`; safe `JSX.Element` and aliased namespace `SolidJSX.Element` annotations become `Element`; renderer-owned `JSX` and `ComponentProps` imports move to type-only imports from `@solidjs/web` when still needed.
- Safe symbol renames: `Suspense` to `Loading`, `SuspenseList` to `Reveal`, `ErrorBoundary` to `Errored`, `Index` to `For`, `mergeProps` to `merge`, `unwrap` to `snapshot`, `onMount` to `onSettled`, `equalFn` to `isEqual`, `getListener` to `getObserver`, and web `addEventListener` to `addEvent`. Unaliased usage and matching namespace members are rewritten where safe.
- Duplicate named imports created by these rewrites are removed when the final module, imported name, local binding, and type/value kind are identical.
- JSX shape changes: `<Index>` and `<Solid.Index>` become keyed-false `For` equivalents, `SuspenseList revealOrder="forwards"` is removed because `Reveal` defaults to sequential ordering, `revealOrder="together"` becomes `order="together"`, `tail="collapsed"` becomes `collapsed`, direct `err.message`/`err.name` reads in imported `Errored` fallback callbacks become `err().message`/`err().name`, `Context.Provider` becomes the context component when the context is locally created with proven unshadowed Solid direct, aliased, or namespace `createContext(...)`, and simple `classList` attributes become Solid 2 `class` object/array values.
- JSON config/package changes: `jsxImportSource: "solid-js"` becomes `"@solidjs/web"`, `jsxImportSource: "solid-js/h"` becomes `"@solidjs/h"`; `package.json` dependency groups move existing `solid-js` and `@solidjs/web` entries to a compatible Solid 2 beta range, add `@solidjs/web` when `solid-js` exists and web is missing, and move `vite-plugin-solid` to the Solid 2-compatible `3.0.0-next` range.

## Manual Review Markers

The codemod adds `TODO(solid-2): Review semantic migration sites...` when it sees APIs that require intent-aware migration. These include unsupported or destructured `ErrorBoundary` fallback parameter usage, unsupported `SuspenseList` props, `onMount` callbacks containing direct, aliased, or namespace `onCleanup`, `createEffect`, `createRenderEffect`, `createMemo`, `createResource`, `createComputed`, `splitProps`, `produce`, `batch`, transitions, error handlers, mutable stores, scheduling, selectors, observable helpers, namespace member usages such as `Solid.batch`, async computations such as `createMemo(async ...)`, removed web internals, and removed DOM directive syntax such as `use:`, `attr:`, `on:`, `class:`, `style:`, and `/*@once*/`.

Review markers may sit above imports that are compile-breaking in Solid 2. This is intentional for removed APIs whose correct migration depends on application behavior; migrate those marked imports manually before expecting the file to typecheck.

Use the Solid 2 migration guide and real tests to migrate these sites. Brenelz's migration notes are especially useful for review heuristics:

- [Things Learned Migrating To Solid 2.0](https://www.brenelz.com/posts/migrating-to-solid-2)
- [Learning Solid 2.0](https://www.brenelz.com/posts/learning-solid2)
- [Handling Errors in Solid 2.0](https://www.brenelz.com/posts/handling-errors-in-solid-2)
- [How My Mental Model of `isPending` Changed](https://www.brenelz.com/posts/is-pending-mental-model)

## Limits

- Removed DOM directive syntaxes are review-marked, not rewritten.
- Safe namespace member and JSX component renames are rewritten; semantic namespace member usages are review-marked, not rewritten.
- Context provider rewrites only run for contexts created by imports proven to come from `solid-js`; local or other-library `createContext` calls are left alone.
- Unsupported `SuspenseList` `revealOrder`/`tail` values are left in place with a review marker.
- Removed `@solidjs/web` internals such as `Aliases`, `Properties`, `classList`, `clearDelegatedEvents`, `getPropAlias`, `setBoolAttribute`, `ssrSpread`, and `use` are review-marked, not rewritten.
- `splitProps` is only flagged, not rewritten to `omit`, because the return shape changes from tuple split values to a single omitted view.
- `createDynamic(source, props)`, `createEffect`, `createRenderEffect`, `createMemo`, `createResource`, store path setters, `batch`, actions, optimistic state, async read/loading-boundary placement, and top-level reactive-read changes are semantic migrations and require test-backed review.
- `JSX.Element` only rewrites to `Element` when the local `JSX` namespace import is used for `JSX.Element` and not for other qualified JSX namespace types.
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
