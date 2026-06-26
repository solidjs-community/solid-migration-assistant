# Solid codemod migration loop run: solid-primitives

- Time: 2026-06-26T20:27:03Z
- Job: 52f404fb347c
- Target: `.repos/solid-primitives`
- Mode: manual-compare (`main` baseline, `next` manual branch available)
- Temp verification run: `/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c`
- Stale lock encountered/cleared: no
- End-of-run commit: pending in committed report; final delivery contains actual hash

## Summary

Processed one bounded `solid-primitives` iteration and fed the focused websocket/event-test failures back into the codemod. The package transform now handles more Solid 2 test/runtime scheduling cases:

1. imports `flush` for direct-migration import collisions involving dispatch-event helpers,
2. imports/adds `flush()` for local event dispatcher calls in tests,
3. adds `ownedWrite: true` when signal setters are called from external callbacks such as `addEventListener`/timers,
4. inserts `flush()` after test `close()` calls, matching WebSocket/mock close state assertions.

## Codemod/package changes

- `codemods/solid-codemod/scripts/source/solid-transform.ts`
  - collects `createEventDispatcher` local variables and flushes after calls in test files;
  - adds external-callback `ownedWrite` detection;
  - treats `.close()` calls as test statements that may require `flush()`;
  - merges duplicate import-edit ranges for `flush` when possible.
- `codemods/solid-codemod/scripts/source/direct-migrations.ts`
  - preserves/adds `flush` on direct Solid import edits when dispatch-event tests require it.
- Fixtures added/updated:
  - `owned-write-external-listener`
  - `test-close-flush`
  - `test-event-dispatcher-flush`
  - `test-flush-direct-import-collision`
  - `test-dispatch-event-flush`

## Verification

Codemod package:

- `pnpm test` exit 0: 84 source fixtures + 12 JSON fixtures passed.
- `pnpm check-types` exit 0.

Target disposable migration run:

- `codemod-run` exit 0.
- `git diff --check && git diff --stat` exit 0.
- `pnpm install --no-frozen-lockfile` exit 0; peer warnings remain expected for Solid 2 beta in a Solid 1-era workspace.
- Focused target Vitest exit 0:
  - `packages/event-dispatcher/test/index.test.ts`
  - `packages/keyboard/test/index.test.ts`
  - `packages/refs/test/index.test.ts`
  - `packages/websocket/test/index.test.ts`

## Commands

```json
[
  {
    "name": "clone",
    "cmd": "git clone --no-hardlinks /home/lucifer/work/active/codemod/solid/solid-codemod/.repos/solid-primitives /tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/codemod",
    "exit_code": 0,
    "seconds": 0.7,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/clone.log",
    "tail": "Cloning into '/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/codemod'...\ndone."
  },
  {
    "name": "checkout-main",
    "cmd": "git checkout main || git checkout origin/main || git checkout master || git checkout origin/master",
    "exit_code": 0,
    "seconds": 0.6,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/checkout-main.log",
    "tail": "Switched to a new branch 'main'\nBranch 'main' set up to track remote branch 'main' from 'origin'."
  },
  {
    "name": "codemod-run",
    "cmd": "cd /home/lucifer/work/active/codemod/solid/solid-codemod/codemods/solid-codemod && pnpm dlx codemod@latest workflow run -w workflow.yaml --target /tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/codemod --no-interactive",
    "exit_code": 0,
    "seconds": 4.8,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/codemod-run.log",
    "tail": "(node:783749) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.\n(Use `node --trace-deprecation ...` to show where the warning was created)\nWorkflow started 0dcbb036-112f-42b0-a8d4-0e361f7c8867\n\u23fa Rewrite Solid source imports and local-safe JSX patterns\n\u23fa Update Solid JSX config and package dependency entries\n\u23fa Install package skill\nWorkflow completed in 3.0s"
  },
  {
    "name": "diff-check",
    "cmd": "git diff --check && git diff --stat",
    "exit_code": 0,
    "seconds": 0.6,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/diff-check.log",
    "tail": "s                   |   3 +\n packages/workers/dev/index.tsx                     |   4 +-\n packages/workers/package.json                      |   6 +-\n packages/workers/src/index.ts                      |  12 +-\n site/package.json                                  |   2 +-\n site/src/api.ts                                    |   2 +-\n site/src/client.tsx                                |   2 +-\n .../components/BundleSizeModal/BundleSizeModal.tsx |  21 +++-\n site/src/components/Header/Header.tsx              |  46 ++++----\n site/src/components/Header/ThemeBtn.tsx            |  12 +-\n site/src/components/Icons/Hamburger.tsx            |  26 +++--\n site/src/components/Modal/SlideModal.tsx           |   6 +-\n site/src/components/Primitives/SizeBadge.tsx       |   3 +-\n site/src/components/Primitives/StageBadge.tsx      |  19 +++-\n site/src/components/Search/ClientSearchModal.tsx   |  23 ++--\n site/src/components/Search/Search.tsx              |  29 ++---\n site/src/components/Search/SearchModal.tsx         |   6 +-\n site/src/components/table.tsx                      |  17 ++-\n site/src/primitives/client-only.ts                 |  21 ++--\n site/src/primitives/createShortcut.ts              |  26 ++---\n site/src/primitives/document-class.tsx             |   2 +-\n site/src/routes/__root.tsx                         |  12 +-\n site/src/routes/index.tsx                          |   2 +-\n .../$name/-components/package-installation.tsx     |   7 +-\n .../-components/primitive-name-tooltip-impl.tsx    |  18 +--\n .../$name/-components/primitive-name-tooltips.tsx  |  12 +-\n site/src/routes/package/$name/index.tsx            |   3 +-\n site/src/routes/playground/$name.tsx               |   8 +-\n template/package.json                              |   6 +-\n template/src/index.ts                              |   9 +-\n template/test/index.test.ts                        |   1 +\n tsconfig.json                                      |   2 +-\n 422 files changed, 3578 insertions(+), 2072 deletions(-)"
  },
  {
    "name": "install",
    "cmd": "pnpm install --no-frozen-lockfile",
    "exit_code": 0,
    "seconds": 6.0,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/install.log",
    "tail": "unmet peer solid-js@^1.6.12: found 2.0.0-beta.15\n\u2502     \u2514\u2500\u252c @solid-primitives/bounds 0.1.5\n\u2502       \u251c\u2500\u2500 \u2715 unmet peer solid-js@^1.6.12: found 2.0.0-beta.15\n\u2502       \u2514\u2500\u252c @solid-primitives/resize-observer 2.1.5\n\u2502         \u2514\u2500\u2500 \u2715 unmet peer solid-js@^1.6.12: found 2.0.0-beta.15\n\u251c\u2500\u252c @tanstack/solid-start 1.167.28\n\u2502 \u251c\u2500\u252c @tanstack/solid-start-server 1.166.33\n\u2502 \u2502 \u2514\u2500\u2500 \u2715 unmet peer solid-js@^1.0.0: found 2.0.0-beta.15\n\u2502 \u2514\u2500\u252c @tanstack/start-plugin-core 1.167.27\n\u2502   \u2514\u2500\u252c @tanstack/router-plugin 1.167.16\n\u2502     \u2514\u2500\u2500 \u2715 unmet peer vite-plugin-solid@^2.11.10: found 3.0.0-next.5\n\u2514\u2500\u252c solid-dismiss 1.8.2\n  \u2514\u2500\u2500 \u2715 unmet peer solid-js@1: found 2.0.0-beta.15\n\ndevDependencies:\n+ @changesets/cli 2.29.4\n+ @nothing-but/node-resolve-ts 1.0.1\n+ @solidjs/start 1.1.4\n+ @solidjs/web 2.0.0-beta.15 (2.0.0-experimental.0 is available)\n+ @types/jsdom 21.1.7\n+ @types/node 22.15.31\n+ @typescript-eslint/eslint-plugin 8.34.0\n+ @typescript-eslint/parser 8.34.0\n+ esbuild 0.25.5\n+ esbuild-plugin-solid 0.6.0\n+ eslint 9.28.0\n+ eslint-plugin-eslint-comments 3.2.0\n+ eslint-plugin-no-only-tests 3.3.0\n+ jsdom 25.0.1\n+ json-to-markdown-table 1.0.0\n+ prettier 3.5.3\n+ prettier-plugin-tailwindcss 0.6.12\n+ rehype-autolink-headings 7.1.0\n+ rehype-highlight 7.0.2\n+ rehype-slug 6.0.0\n+ remark-gfm 4.0.1\n+ solid-js 2.0.0-beta.15\n+ typescript 5.8.3 (6.0.3 is available)\n+ vinxi 0.5.7\n+ vite 6.3.5\n+ vite-plugin-solid 3.0.0-next.5\n+ vitest 2.1.9\n\n\u256d Warning \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256e\n\u2502                                                                              \u2502\n\u2502   Ignored build scripts: @parcel/watcher.                                    \u2502\n\u2502   Run \"pnpm approve-builds\" to pick which dependencies should be allowed     \u2502\n\u2502   to run scripts.                                                            \u2502\n\u2502                                                                              \u2502\n\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256f\n\nDone in 5.2s using pnpm v10.12.1"
  },
  {
    "name": "focused-tests",
    "cmd": "pnpm exec vitest -c ./configs/vitest.config.ts packages/event-dispatcher/test/index.test.ts packages/keyboard/test/index.test.ts packages/refs/test/index.test.ts packages/websocket/test/index.test.ts --run",
    "exit_code": 0,
    "seconds": 1.9,
    "log": "/tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/focused-tests.log",
    "tail": "\u001b[34mTesting ALL packages...\u001b[0m\n\n RUN  v2.1.9 /tmp/solid-codemod-runs/20260626-202901-solid-primitives-rerun-52f404fb347c/codemod\n\n \u2713 packages/event-dispatcher/test/index.test.ts (1 test) 3ms\n \u2713 packages/websocket/test/index.test.ts (9 tests) 11ms\n \u2713 packages/refs/test/index.test.ts (2 tests) 4ms\n \u2713 packages/keyboard/test/index.test.ts (5 tests) 7ms\n\n Test Files  4 passed (4)\n      Tests  17 passed (17)\n   Start at  15:29:15\n   Duration  716ms (transform 162ms, setup 0ms, collect 254ms, tests 25ms, environment 994ms, prepare 337ms)\n"
  }
]
```

## Findings

- Previous focused failures in `event-dispatcher`, `keyboard`, `refs`, and `websocket` were reduced to zero in the focused verification set.
- The fix that changed `createWSState` from receiving `0` after open to `1` exposed the next missing scheduling flush after `ws.close()`; adding `.close()` flush coverage resolved that focused test.
- `solid-primitives` is not marked fully successful yet because this run intentionally stayed bounded to package tests plus the focused target subset. A later iteration should run broader workspace verification or compare remaining migration diff against `next`.

## Status / next action

Status: `needs-broader-verification`.

Next action: rerun `solid-primitives` with broader verification (e.g. workspace `pnpm test`/selected package matrix or build) now that the focused event/keyboard/refs/websocket subset passes.
