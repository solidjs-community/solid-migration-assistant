# Solid codemod migration loop run: solid-primitives

- Time: 2026-06-26T19:33:33Z
- Job: 52f404fb347c
- Target: solid-primitives
- Mode: manual-compare
- Baseline branch: main
- Manual branch: next
- Temp run dir: /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c
- Lock: acquired normally; no stale lock was encountered.
- End-of-run commit: pending in committed report; final delivery records the actual hash.
- Status: needs-codemod-fix

## Commands

| Command | Exit | Log |
|---|---:|---|
| codemod registry search: `npx codemod@latest search "solid 2"` | 0 | No packages found. |
| package verification: `pnpm test && pnpm check-types` | 0 | local command output in Hermes run |
| clone | 0 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/clone.log |
| checkout-main | 0 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/checkout-main.log |
| codemod-run | 0 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/codemod-run.log |
| diff-check | 0 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/diff-check.log |
| install | 0 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/install.log |
| focused-tests | 1 | /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/focused-tests.log |

Package-level verification after codemod edits: `pnpm test` exited 0 and `pnpm check-types` exited 0.

## Codemod changes

- Added a fixture-backed `createComputed(() => captured = accessor())` migration that removes the Solid 1 `createComputed` runtime stub from simple test-style captured accessor assertions by rewriting subsequent reads to the accessor and leaving a harmless `void accessor();` placeholder.
- Extended test-file flush automation to insert `flush()` after direct Solid signal setter calls and Vitest timer advancement calls (`vi.advanceTimersByTime`, `vi.advanceTimersToNextTimer`, `vi.runAllTimers`, `vi.runOnlyPendingTimers`).
- Fixed the dispatch/timer flush import path so an existing non-type `solid-js` import prevents a duplicate standalone `import { flush } from "solid-js";`.

## Findings

1. `git diff --check` is now clean on a fresh solid-primitives codemod run after changing the captured-accessor rewrite to avoid whitespace-only deleted lines.
2. The previously observed websocket focused test now passes in this run (`packages/websocket/test/index.test.ts`: 9 tests passed), indicating timer flush insertion addresses that class of scheduling failure.
3. Focused verification still exits 1. Remaining failures are now narrower:
   - `packages/event-dispatcher/test/index.test.ts` fails because `dispatch("changeStep", "second")` returns `false` under the migrated `@solidjs/web`/server path, before the signal assertion; this needs a focused fixture around `isServer`/client-runtime import behavior or a documented manual setup requirement.
   - `packages/keyboard` and `packages/refs` fail during module resolution for internal workspace packages (`@solid-primitives/event-listener`, `@solid-primitives/utils/immutable`) in the disposable clone. This appears to be a workspace build/export verification issue rather than the previous keyboard/refs assertion class; next run should use the repo's expected workspace build/prepack step or a narrower package-level verification command.

## Diff stat excerpt

```text
 packages/upload/src/index.ts                       |  10 +-
 packages/upload/test/index.test.tsx                |   1 +
 packages/utils/package.json                        |   6 +-
 packages/utils/src/index.ts                        |  29 ++---
 packages/virtual/dev/index.tsx                     |   6 +-
 packages/virtual/package.json                      |   6 +-
 packages/virtual/src/index.tsx                     |  11 +-
 packages/virtual/test/index.test.tsx               |  12 +-
 packages/virtual/test/server.test.tsx              |   2 +-
 packages/websocket/dev/index.tsx                   |   6 +-
 packages/websocket/package.json                    |   6 +-
 packages/websocket/test/index.test.ts              |  14 ++-
 packages/websocket/test/setup.ts                   |   3 +
 packages/workers/dev/index.tsx                     |   4 +-
 packages/workers/package.json                      |   6 +-
 packages/workers/src/index.ts                      |  12 +-
 site/package.json                                  |   2 +-
 site/src/api.ts                                    |   2 +-
 site/src/client.tsx                                |   2 +-
 .../components/BundleSizeModal/BundleSizeModal.tsx |  21 +++-
 site/src/components/Header/Header.tsx              |  44 ++++----
 site/src/components/Header/ThemeBtn.tsx            |  12 +-
 site/src/components/Icons/Hamburger.tsx            |  26 +++--
 site/src/components/Modal/SlideModal.tsx           |   6 +-
 site/src/components/Primitives/SizeBadge.tsx       |   3 +-
 site/src/components/Primitives/StageBadge.tsx      |  19 +++-
 site/src/components/Search/ClientSearchModal.tsx   |  23 ++--
 site/src/components/Search/Search.tsx              |  29 ++---
 site/src/components/Search/SearchModal.tsx         |   6 +-
 site/src/components/table.tsx                      |  17 ++-
 site/src/primitives/client-only.ts                 |  21 ++--
 site/src/primitives/createShortcut.ts              |  26 ++---
 site/src/primitives/document-class.tsx             |   2 +-
 site/src/routes/__root.tsx                         |  12 +-
 site/src/routes/index.tsx                          |   2 +-
 .../$name/-components/package-installation.tsx     |   7 +-
 .../-components/primitive-name-tooltip-impl.tsx    |  18 +--
 .../$name/-components/primitive-name-tooltips.tsx  |  12 +-
 site/src/routes/package/$name/index.tsx            |   3 +-
 site/src/routes/playground/$name.tsx               |   8 +-
 template/package.json                              |   6 +-
 template/src/index.ts                              |   9 +-
 template/test/index.test.ts                        |   1 +
 tsconfig.json                                      |   2 +-
 419 files changed, 3540 insertions(+), 2052 deletions(-)
```

## Install tail

```text
+ eslint-plugin-no-only-tests 3.3.0
+ jsdom 25.0.1
+ json-to-markdown-table 1.0.0
+ prettier 3.5.3
+ prettier-plugin-tailwindcss 0.6.12
+ rehype-autolink-headings 7.1.0
+ rehype-highlight 7.0.2
+ rehype-slug 6.0.0
+ remark-gfm 4.0.1
+ solid-js 2.0.0-beta.15
+ typescript 5.8.3 (6.0.3 is available)
+ vinxi 0.5.7
+ vite 6.3.5
+ vite-plugin-solid 3.0.0-next.5
+ vitest 2.1.9

╭ Warning ─────────────────────────────────────────────────────────────────────╮
│                                                                              │
│   Ignored build scripts: @parcel/watcher.                                    │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed     │
│   to run scripts.                                                            │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯

Done in 8.4s using pnpm v10.12.1
```

## Focused verification tail

```text

 RUN  v2.1.9 /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/codemod

 ❯ packages/refs/test/index.test.ts (0 test)
 ❯ packages/keyboard/test/index.test.ts (0 test)
 ✓ packages/websocket/test/index.test.ts (9 tests) 21ms
 ❯ packages/event-dispatcher/test/index.test.ts (1 test | 1 failed) 18ms
   × createEventDispatcher primitive test > createEventDispatcher return values and callback execution 15ms
     → it should return true, as the callback has been called and the event is not cancellable: expected false to be true // Object.is equality

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/keyboard/test/index.test.ts [ packages/keyboard/test/index.test.ts ]
Error: Failed to resolve entry for package "@solid-primitives/event-listener". The package may have incorrect main/module/exports specified in its package.json.
  Plugin: vite:import-analysis
  File: /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/codemod/packages/keyboard/src/index.ts
 ❯ packageEntryFailure node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:46574:15
 ❯ resolvePackageEntry node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:46571:3
 ❯ tryNodeResolve node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:46387:16
 ❯ ResolveIdContext.resolveId node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:46137:19
 ❯ PluginContainer.resolveId node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:48952:17
 ❯ TransformPluginContext.resolve node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:49112:15
 ❯ normalizeUrl node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:63973:26
 ❯ node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:64112:39

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  packages/refs/test/index.test.ts [ packages/refs/test/index.test.ts ]
Error: Failed to load url @solid-primitives/utils/immutable (resolved id: @solid-primitives/utils/immutable) in /tmp/solid-codemod-runs/20260626-193333-solid-primitives-52f404fb347c/codemod/packages/refs/test/index.test.ts. Does the file exist?
 ❯ loadAndTransform node_modules/.pnpm/vite@5.4.4_@types+node@22.15.31_lightningcss@1.32.0_sass@1.77.8_terser@5.42.0/node_modules/vite/dist/node/chunks/dep-BEhTnQAI.js:51857:17

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/event-dispatcher/test/index.test.ts > createEventDispatcher primitive test > createEventDispatcher return values and callback execution
AssertionError: it should return true, as the callback has been called and the event is not cancellable: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ packages/event-dispatcher/test/index.test.ts:31:9
     29|         dispatch("changeStep", "second"),
     30|         "it should return true, as the callback has been called and th…
     31|       ).toBe(true);
       |         ^
     32| 
     33|       expect(step(), "step should have changed to second").toBe("secon…
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:156:36
 ❯ runWithOwner node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:81:12
 ❯ Module.createRoot node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:156:10
 ❯ packages/event-dispatcher/test/index.test.ts:14:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯

 Test Files  3 failed | 1 passed (4)
      Tests  1 failed | 9 passed (10)
   Start at  14:33:47
   Duration  853ms (transform 390ms, setup 0ms, collect 358ms, tests 38ms, environment 2ms, prepare 886ms)

```

## Next action

Triage the remaining solid-primitives failures: add a minimal event-dispatcher/isServer fixture or TODO-marker behavior, and adjust the disposable verification command to build/link internal workspace packages before running keyboard/refs tests.
