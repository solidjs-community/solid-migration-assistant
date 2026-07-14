# Solid v2 first pass

This is the first executable vertical slice of the Solid 1 to Solid 2 migration. It handles proven Vite client applications and publishable packages identified by a `solid-js` peer dependency. It pins the renderer/compiler/runtime tuple used by the local Solid beta.17 checkout, while preserving different application and library dependency policies.

## Automated in this slice

- Pin `solid-js` and `@solidjs/web` to `2.0.0-beta.17`.
- Pin `vite-plugin-solid` to `3.0.0-next.5`.
- Pin a directly declared `babel-preset-solid` to `2.0.0-beta.17`.
- For publishable libraries, move existing Solid peer ranges to `^2.0.0-beta.17` and add exact runtime/renderer dev dependencies plus renderer peers.
- Treat private/workspaces manifests with dev-only Solid evidence as workspace roots and update their runtime, renderer, plugin, and directly declared compiler tuple coherently.
- Update default or named Bun catalog owners in `catalog`, `catalogs`, `workspaces.catalog`, or `workspaces.catalogs`, while preserving `catalog:` references in consumer manifests.
- Change TypeScript's `jsxImportSource` to `@solidjs/web`.
- Rewrite `solid-js/web` renderer imports to `@solidjs/web`.
- Move supported `solid-js/store` imports into `solid-js` after classifying removed helpers.
- Wrap legacy path-style store setter arguments with Solid 2's `storePath` compatibility helper.
- Split a supported single-call effect into Solid 2 tracking and apply phases, using `deep` for paths rooted in a discovered store binding.
- Wrap a discovered store setter followed by a read from that same store in `flush` so the read observes the committed value.
- Remove `produce` around a proven store setter and replace serialization-only `unwrap` with `snapshot`.
- Convert imported `batch` boundaries to `flush` without depending on application-specific callee or variable names.
- Convert imported or aliased `onMount`/nested `onCleanup` lifecycle shapes to `onSettled` only when there is exactly one top-level cleanup callback; block broader control flow.
- Convert Router-style rest-only `splitProps` declarations to `omit(props, ...keys)`. Selected bindings are converted only when every observed use is a direct read of a statically selected key.
- Preserve the local bindings of renamed `mergeProps` and `batch` imports with `merge as localName` and `flush as localName`, preventing collisions and accidental rewriting of shadowed identifiers.
- Convert paired `Index` trees, DOM `classList` composition, local directive definition/call-site pairs, contexts, proven prop helpers, async boundaries, selectors, and renderer-owned JSX types exercised by the fixtures.
- Preserve indexed-row reactivity by converting eager reactive fields in spread props objects to getters before `Index` becomes `For keyed={false}`.
- Wrap direct reactive-prop `createSignal` initializers in `untrack` to make their intended one-time read explicit under Solid 2 diagnostics.
- Split deterministic effects into compute/apply phases and add an idempotent `S2-EFFECT-001` marker to unsupported effects.
- Preserve consistently authored LF or CRLF files, including generated import and blocker lines.
- Emit an `S2-BLOCKER-STORE-001` marker instead of preserving imports for removed store APIs that cannot be migrated safely.
- Fail the workflow when a blocker, unsupported effect, beta.17-proven removed Solid 1 export, `solid-js/store` import, local or unresolved cross-file `.Provider`, or covered legacy JSX form remains. `onCleanup` is deliberately accepted because beta.17 exports it at runtime and in its types. Positive and expected-failure validator fixtures exercise both sides of that contract.

## Deliberate boundaries

The runtime rewrites are evidence-based shapes exercised by the modular Kanban fixture and focused alias, collision, Router, lifecycle, and directive regression fixtures. Unsupported store APIs, selected-prop escapes, cross-file directives, complex lifecycle control flow, and effect shapes stop the workflow for manual migration rather than producing output presented as complete.

The authoritative runner performs repository discovery before and after the AST workflow. Its `.solid2-migration.json` manifest inventories target packages, package roles, workspace dependencies, Bun catalog owners and consumers, Solid ecosystem dependencies, installed peer ranges, removed deep imports in installed direct dependencies, and every unresolved source marker or legacy form. Known Solid 1 peers, dependency deep imports, missing/mixed catalogs, residual Solid 1 runtime versions, and source blockers keep the manifest in `blocked` state.

Discovery intentionally reports unverified ecosystem packages as warnings rather than inventing compatible versions. Installed packages with a proven incompatible `solid-js` peer range or removed `solid-js/web` / `solid-js/store` import are blockers. The runner does not run a package manager, rewrite lockfiles, delete obsolete modules, migrate bundler externals, or claim support for SSR and alternative renderers; those remain explicit validation steps after the manifest is clean.

Source transforms do not yet receive the package role discovered from `package.json`. In particular, `storePath` is application compatibility scaffolding and must not be accepted as a library architecture without package-level review. Cross-file providers are conservatively rejected, not rewritten, because per-file validation cannot prove their bindings. Cross-file directive transactions, obsolete-module deletion, router/cache algorithms, ownership, and multi-operation effects remain semantic migration work.

Run the authoritative entry point from the repository root:

```sh
pnpm --dir ./codemods/solid migrate --target /path/to/app
```

This wrapper runs the AST workflow, invokes the validator directly, writes
`/path/to/app/.solid2-migration.json`, and exits nonzero if the workflow, validator, or postflight
manifest fails. It is the supported CI and automation path.

Then review the diff and regenerate the npm dependency graph before validation:

```sh
rm -rf node_modules package-lock.json
npm install
npm run typecheck
npm run build
npm run test:e2e
```

The validation transform throws on incomplete output. Some Codemod workflow CLI versions report a thrown `js-ast-grep` step error without reliably propagating a nonzero workflow exit. A raw `codemod workflow run` is therefore diagnostic only. If the wrapper cannot be used, run the validator directly and treat its exit code as authoritative:

```sh
pnpm dlx codemod@latest jssg run \
  --language tsx \
  ./codemods/solid/scripts/validate.ts \
  --target /path/to/app \
  --allow-dirty \
  --no-interactive
```
