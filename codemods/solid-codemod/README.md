# solid-codemod

Migrate local-safe Solid 1.x patterns to Solid 2.

This codemod intentionally focuses on changes that can be determined from local syntax. It rewrites documented package/import moves, safe symbol renames, several local JSX shape changes, selected direct-call migrations, and JSON config/package entries. It leaves semantic migrations as review markers because effect splitting, async data, updater-style store setters, and transition behavior require application intent.

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
- Safe symbol renames: `Suspense` to `Loading`, `SuspenseList` to `Reveal`, `ErrorBoundary` to `Errored`, `Index` to `For`, `mergeProps` to `merge`, `unwrap` to `snapshot`, `batch` to `flush`, `onMount` to `onSettled`, `equalFn` to `isEqual`, `getListener` to `getObserver`, and web `addEventListener` to `addEvent`. Unaliased usage and matching namespace members are rewritten where safe.
- Duplicate named imports created by these rewrites are removed when the final module, imported name, local binding, and type/value kind are identical.
- JSX shape changes: `<Index>` and `<Solid.Index>` become keyed-false `For` equivalents, `SuspenseList revealOrder="forwards"` is removed because `Reveal` defaults to sequential ordering, `revealOrder="together"` becomes `order="together"`, `tail="collapsed"` becomes `collapsed`, direct `err.message`/`err.name` reads in imported `Errored` fallback callbacks become type-safe `(err() as Error).message`/`(err() as Error).name`, `Context.Provider` becomes the context component when the context is locally created with proven unshadowed Solid direct, aliased, or namespace `createContext(...)`, imported or unknown `.Provider` uses are marked for review, and simple `classList` attributes become Solid 2 `class` object/array values.
- DOM directive changes: straightforward `use:`, `attr:`, `bool:`, `on:`, `class:`, and `style:` attributes are mechanically rewritten to Solid 2 attribute forms. `oncapture:` remains review-only.
- Direct-call changes: two-argument direct `createDynamic(source, props)` and web namespace `SolidWeb.createDynamic(source, props)` become `createComponent(dynamic(source), props)` or `createComponent(SolidWeb.dynamic(source), props)`; rest-only `splitProps` becomes `omit`; direct `produce(...)` wrappers inside setters are unwrapped; string-literal store path setters with non-function final values become `storePath(...)`; `createMemo(fn, initial, options)` drops the Solid 1 initial argument, preserves type arguments, and when the callback accepts a previous value, moves the initial value into a default parameter such as `(prev = initial) => ...`; `createMemo(fn, initial)` drops the initial when the callback does not use a previous-value parameter.
- JSON config/package changes: `jsxImportSource: "solid-js"` becomes `"@solidjs/web"`, `jsxImportSource: "solid-js/h"` becomes `"@solidjs/h"`; `package.json` dependency groups move existing `solid-js` and `@solidjs/web` entries to a compatible Solid 2 beta range, add `@solidjs/web` when `solid-js` exists and web is missing, and move `vite-plugin-solid` to the Solid 2-compatible `3.0.0-next` range, move `@solidjs/testing-library` to the Solid 2 beta-compatible `1.0.0-beta` range, and move `@solidjs/router` to the Solid 2-compatible `0.17.0-next` range. Lockfiles are not rewritten; rerun your package manager install after package changes.

## Manual Review Markers

- Solid 1 `Signal<T>` type imports are rewritten to a local tuple-compatible review alias so hand-authored integration tuples do not accidentally pick up Solid 2 `SourceAccessor` branding before the owning API is reviewed. Intersections that assert `createSignal(...) as Signal<T>` with additional structural fields are bridged through `unknown` to preserve a compile-time review marker instead of pretending the extra fields are proven safe.

The codemod adds `TODO(solid-2): Review semantic migration sites...` when it sees APIs that require intent-aware migration. These include unsupported or destructured `ErrorBoundary` fallback parameter usage, unsupported `SuspenseList` props, unproven `.Provider` usage, `onMount` callbacks containing direct, aliased, or namespace `onCleanup`, `createEffect`, `createRenderEffect`, async or mechanically unsupported two-argument `createMemo`, `createResource`, unhandled `createComputed`, unhandled `splitProps`, unhandled `produce`, transitions, error handlers, mutable stores, `ReconcileOptions`, `sharedConfig.context`, scheduling/dev internals, selectors, observable helpers, unsupported namespace member usages, async computations such as `createMemo(async ...)`, removed web internals, `oncapture:`, and `/*@once*/`.

Review markers may sit above imports that are compile-breaking in Solid 2. This is intentional for removed APIs whose correct migration depends on application behavior; migrate those marked imports manually before expecting the file to typecheck.

Use the Solid 2 migration guide and real tests to migrate these sites. Brenelz's migration notes are especially useful for review heuristics:

- [Things Learned Migrating To Solid 2.0](https://www.brenelz.com/posts/migrating-to-solid-2)
- [Learning Solid 2.0](https://www.brenelz.com/posts/learning-solid2)
- [Handling Errors in Solid 2.0](https://www.brenelz.com/posts/handling-errors-in-solid-2)
- [How My Mental Model of `isPending` Changed](https://www.brenelz.com/posts/is-pending-mental-model)

## Limits

- Most removed DOM directive syntaxes are rewritten when their local attribute value is straightforward; `oncapture:` is review-marked, not rewritten.
- Safe namespace member and JSX component renames are rewritten; semantic namespace member usages are review-marked, not rewritten.
- Context provider rewrites only run for contexts created by imports proven to come from `solid-js`; local or other-library `createContext` calls are left alone, and imported or unknown `.Provider` uses are marked.
- Unsupported `SuspenseList` `revealOrder`/`tail` values are left in place with a review marker.
- Removed `@solidjs/web` internals such as `Aliases`, `Properties`, `SVGNamespace`, `classList`, `clearDelegatedEvents`, `effect`, `getPropAlias`, `setBoolAttribute`, `ssrSpread`, and `use` are review-marked, not rewritten.
- `splitProps` is only rewritten for rest-only destructuring; other tuple uses are review-marked because the return shape changes from tuple split values to a single omitted view.
- Only direct two-argument `createDynamic` calls are rewritten; other `createDynamic` shapes are review-marked.
- Store path setters are rewritten only when all path segments before the final value are string literals and the final value is not a function/updater; `reconcile(...)` path setter values are cast because Solid 2 store path setters no longer accept the old void-returning reconciler type directly. Other setter shapes are review-marked or left alone.
- `batch` imports and usages are renamed to `flush`; validate behavior with tests because surrounding scheduling intent can still be application-specific.
- `createEffect`, `createRenderEffect`, `createResource`, actions, optimistic state, async read/loading-boundary placement, and top-level reactive-read changes are semantic migrations and require test-backed review.
- `JSX.Element` only rewrites to `Element` when the local `JSX` namespace import is used for `JSX.Element` and not for other qualified JSX namespace types.
- The source transform uses the TSX parser for JS/TS/JSX/TSX files so JSX-aware rewrites can run in one pass.
- Third-party ecosystem packages are not upgraded unless a conservative Solid 2-compatible range is known. If verification still resolves dependencies that import removed Solid 1 subpaths such as `solid-js/web` (for example current `terracotta`, `solid-use`, `solid-marked`, or `solid-refresh` releases), treat those as manual dependency-remediation blockers rather than rewriting installed `node_modules`.
- Solid Start packages are only updated where a known Solid 2-compatible release exists. Current `@solidjs/start@2.0.0-alpha.*` releases still bring Solid 1-era transitive dependencies such as `vite-plugin-solid@2`, `terracotta`, and `solid-js/web` imports in real projects; treat those as manual dependency-remediation blockers instead of forcing package-manager overrides or broad Vite aliases.

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

- Rewrites same-file Solid `createContext` providers and imported/external context values named `*ContextObj` from `<X.Provider>` to `<X>`; other imported providers receive review markers instead of unsafe rewrites.

- Removed runtime APIs such as `createResource`, `catchError`, `createEffect`, and `createRenderEffect` now receive review-marked compatibility stubs that avoid immediate TypeErrors in simple tests; they remain semantic TODOs, not a substitute for real Solid 2 primitives.
