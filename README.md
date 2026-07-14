# Solid 2 codemod

This repository is building a behavior-verified Solid 1 to Solid 2 migration workflow. The first executable slice lives in [`codemods/solid-v2-first-pass`](codemods/solid-v2-first-pass) and is validated against the Solid 1 Kanban application in [`.repos/kanban`](.repos/kanban).

## Current executable scope

Version one targets npm-based Vite 6 client applications and the exact Solid beta.17 toolchain used by the local upstream checkout. It automates:

- runtime, renderer, and Vite plugin dependency pins;
- TypeScript JSX import-source migration;
- renderer and store import moves;
- legacy path-style store setters via `storePath`;
- deep-tracked persistence effect splitting;
- same-tick and explicit batch boundaries via `flush`;
- serialization-safe `unwrap` replacement and draft-first `produce` removal;
- lifecycle conversion from `onMount`/`onCleanup` to `onSettled`; and
- proven `Index`, `classList`, and renderer-owned JSX type migrations.

The older phase-oriented packages remain design scaffolds and are still no-ops. Unsupported one-argument effects receive a coded review marker instead of being silently treated as migrated.

## Run the first pass

```sh
codemod workflow run \
  -w ./codemods/solid-v2-first-pass \
  -t /path/to/vite-solid-app
```

The first pass does not mutate lockfiles or install dependencies. For the npm profile, regenerate the dependency graph after reviewing the codemod diff:

```sh
rm -rf node_modules package-lock.json
npm install
npm run typecheck
npm run build
```

## Develop and verify

```sh
codemod jssg test -l json \
  ./codemods/solid-v2-first-pass/scripts/config.ts \
  ./codemods/solid-v2-first-pass/tests/config

codemod jssg test -l tsx \
  ./codemods/solid-v2-first-pass/scripts/source.ts \
  ./codemods/solid-v2-first-pass/tests/source

codemod workflow validate \
  -w ./codemods/solid-v2-first-pass/workflow.yaml
```

Always run migrations on a clean worktree and review the resulting diff before regenerating the lockfile.
