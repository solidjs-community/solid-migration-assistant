# Solid codemod migration loop run: solid-primitives broad verification

- Job: 52f404fb347c
- Started: 2026-06-27T04:23:39Z
- Completed report update: 2026-06-27T04:33:35Z
- Target: .repos/solid-primitives
- Mode: manual-compare
- Baseline branch/ref: main bddbafcb3ad6
- Manual branch/ref: next 9641025152cd
- Run dir: /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c
- Stale lock encountered/cleared: no
- Status: needs-codemod-fix
- End-of-run commit: pending at report write time; final delivery records the created commit hash.

## Commands

- registry-search: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/registry-search.log
- clone-codemod: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/clone-codemod.log
- checkout-codemod-baseline: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/checkout-codemod-baseline.log
- clone-manual: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/clone-manual.log
- checkout-manual: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/checkout-manual.log
- manual-config-diff: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/manual-config-diff.log
- codemod-run: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/codemod-run.log
- install: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/install.log
- diff-check-stat: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/diff-check-stat.log
- verify-test-client: exit 1, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/verify-test-client.log
- verify-test-ssr: exit 1, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/verify-test-ssr.log
- codemod-package-test: exit 1, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/codemod-package-test.log
- codemod-package-check-types: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/codemod-package-check-types.log
- codemod-package-test-2: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/codemod-package-test-2.log
- codemod-package-check-types-2: exit 0, log /tmp/solid-codemod-runs/20260627-042339-solid-primitives-broad-52f404fb347c/codemod-package-check-types-2.log

## Verification

- Codemod workflow apply exit 0
- Target pnpm install --no-frozen-lockfile exit 0
- Target git diff --check and git diff --stat exit 0
- Target pnpm run test:client exit 1 with 79 failed files, 376 failed tests, 18 errors
- Target pnpm run test:ssr exit 1 with 3 failed files, 7 failed tests
- Codemod package pnpm test exit 0 after fixture update, 90 source fixtures and 12 JSON fixtures
- Codemod package pnpm check-types exit 0

## Findings

- Registry discovery with npx codemod latest search solid found no exact existing package to replace this local feedback loop.
- Applied the local codemod to disposable solid-primitives main bddbafcb3ad6 and compared context with manual next 9641025152cd.
- Manual next adds configs/vitest.config.solid2.ts and package/config updates; this iteration used baseline test:client and test:ssr scripts after migration.
- Target install and git diff check passed, but broad client verification still has many semantic failures: 79 failed files, 376 failed tests, 18 errors.
- Target SSR verification is narrower but still fails: 3 failed files, 7 failed tests.
- Fixed actionable invalid-output bug: selected-prop splitProps now emits a conservative proxy-based compatibility stub instead of undefined as any while retaining the TODO review marker.

## Codemod changes

- codemods/solid-codemod/scripts/source/solid-transform.ts updated splitProps review stub runtime.
- codemods/solid-codemod/tests/source/splitprops-selected-compat/input.tsx and expected.tsx added.
- codemods/solid-codemod/tests/source/review-only/expected.tsx updated.

## Next action

Continue solid-primitives triage before marking successful. Highest-value next fixture/fix candidates: createEffect/onSettled cleanup return behavior, createMemo previous-value compatibility, and ownedWrite-safe event-listener signal writes. The splitProps selected-prop invalid runtime output is fixed in this checkpoint.

## Target client verification tail

```text
efore it was thrown.

⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
Error: [REACTIVE_WRITE_IN_OWNED_SCOPE] Writing to reactive state inside an owned scope (component, computation) is not allowed. Move the write outside or set the `ownedWrite` option if this is intentional.
 ❯ setSignal node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2161:11
 ❯ callTheUserObjectsOperation node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30
 ❯ innerInvokeEventListeners node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25
 ❯ invokeEventListeners node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3
 ❯ EventTargetImpl._dispatch node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9
 ❯ EventTargetImpl.dispatchEvent node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17
 ❯ dispatchEvent node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34
 ❯ Module.setOnline packages/connectivity/test/setup.ts:6:10
      4| export const setOnline = (value: boolean) => {
      5|   online = value;
      6|   window.dispatchEvent(new Event(value ? "online" : "offline"));
       |          ^
      7|   flush();
      8| };
 ❯ packages/connectivity/test/index.test.ts:26:7
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36

This error originated in "packages/connectivity/test/index.test.ts" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "works". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: splitProps is not a function or its return value is not iterable
 ❯ Module.createScriptLoader packages/script-loader/src/index.ts:43:38
     41|   const eventKeys: string[] = Object.keys(props).filter(p => p.startsW…
     42|   // TODO(solid-2): Review splitProps selected-prop usage; only rest-o…
     43| const [local, events, scriptProps] = splitProps(
       |                                      ^
     44|     props,
     45|     OMITTED_PROPS,
 ❯ packages/script-loader/test/index.test.ts:110:24
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/script-loader/test/index.test.ts:108:7
 ❯ packages/script-loader/test/index.test.ts:107:11
 ❯ node_modules/.pnpm/@vitest+runner@2.1.9/node_modules/@vitest/runner/dist/index.js:146:14
 ❯ node_modules/.pnpm/@vitest+runner@2.1.9/node_modules/@vitest/runner/dist/index.js:533:11

This error originated in "packages/script-loader/test/index.test.ts" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "will update the url from an accessor". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 Test Files  79 failed | 32 passed | 2 skipped (113)
      Tests  376 failed | 528 passed | 3 skipped | 3 todo (910)
     Errors  18 errors
   Start at  23:25:12
   Duration  59.96s (transform 23.88s, setup 0ms, collect 45.06s, tests 154.15s, environment 35.24s, prepare 2.93s)

 ELIFECYCLE  Command failed with exit code 1.
```

## Target SSR verification tail

```text
 ❯ read node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:282:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/7]⎯

 FAIL  packages/pagination/test/server.test.ts > createPagination > createPagination returns props
 FAIL  packages/pagination/test/server.test.ts > createPagination > createPagination clamps start
 FAIL  packages/pagination/test/server.test.ts > createPagination > createPagination pages reused
TypeError: Cannot read properties of undefined (reading '0')
 ❯ packages/pagination/src/index.ts:187:11
    185|       [...Array(opts().pages)].map(
    186|         (_, i) =>
    187|           previous[i] ||
       |           ^
    188|           ((pageNo: number) =>
    189|             Object.defineProperties(
 ❯ Object.compute packages/pagination/src/index.ts:185:32
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:260:82
 ❯ runWithObserver node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:163:12
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:260:49
 ❯ runWithOwner node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:81:12
 ❯ run node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:260:23
 ❯ update node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:263:22
 ❯ Module.createMemo node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:278:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/7]⎯

 FAIL  packages/pagination/test/server.test.ts > createInfiniteScroll > createInfiniteScroll
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/7]⎯

 FAIL  packages/presence/test/server.test.ts > on server > createPresence initializes requested state as expected
 FAIL  packages/presence/test/server.test.ts > on server > createPresence initializes requested switching state as expected
ReferenceError: document is not defined
 ❯ packages/presence/src/index.ts:87:7
     85| createEffect(() => {
     86|     if (source() && isMounted() && !isVisible()) {
     87|       document.body.offsetHeight; // force reflow
       |       ^
     88| 
     89|       const animationFrameId = requestAnimationFrame(() => {
 ❯ createEffect.previous packages/presence/src/index.ts:14:208
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:529:74
 ❯ runWithObserver node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:163:12
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:529:46
 ❯ runWithOwner node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:81:12
 ❯ serverEffect node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:529:20
 ❯ Module.createEffect node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:541:3
 ❯ createEffect packages/presence/src/index.ts:14:181
 ❯ createPresenceBase packages/presence/src/index.ts:85:1

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/7]⎯

 Test Files  3 failed | 33 passed | 1 skipped (37)
      Tests  7 failed | 83 passed | 1 todo (95)
   Start at  23:26:35
   Duration  6.00s (transform 3.85s, setup 0ms, collect 7.54s, tests 5.12s, environment 6ms, prepare 2.57s)

 ELIFECYCLE  Command failed with exit code 1.
 ELIFECYCLE  Command failed with exit code 1.
```

## Package test verification tail

```text
test onmount-cleanup-alias-namespace       ... ok
test owned-write-empty-signal              ... ok
test owned-write-external-listener         ... ok
test owned-write-signal-scope              ... ok
test owned-write-trailing-comma-signal     ... ok
test produce-direct-wrapper                ... ok
test prop-destructure-defaults-preserve    ... ok
test prop-destructure-simple               ... ok
test reconcile-options-review              ... ok
test removed-runtime-stubs                 ... ok
test renderer-jsx-module-augmentation      ... ok
test renderer-types-inline                 ... ok
test reveal-props                          ... ok
test reveal-props-expressions              ... ok
test review-effects-memo                   ... ok
test review-only                           ... ok
test review-only-remaining                 ... ok
test review-types-scheduler-dev            ... ok
test separate-import-collision             ... ok
test shadowed-usage                        ... ok
test shared-config-context                 ... ok
test signal-type-compat                    ... ok
test solid2-runtime-preserved              ... ok
test splitprops-rest-only                  ... ok
test splitprops-selected-compat            ... ok
test store-path-compat                     ... ok
test store-path-reconcile                  ... ok
test suspense-list-unsupported-props       ... ok
test test-close-flush                      ... ok
test test-dispatch-event-flush             ... ok
test test-event-dispatcher-flush           ... ok
test test-flush-direct-import-collision    ... ok
test test-flush-scheduling                 ... ok
test web-internals                         ... ok

test result: ok. 90 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s


> solid-codemod@0.1.0 test:json /home/lucifer/work/active/codemod/solid/solid-codemod/codemods/solid-codemod
> pnpm dlx codemod@latest jssg test -l json ./scripts/json-config.ts ./tests/json --strictness ast

(node:1073691) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

running 12 tests
test config                        ... ok
test config-hyperscript            ... ok
test package                       ... ok
test package-all-groups            ... ok
test package-babel-preset-solid    ... ok
test package-existing-web          ... ok
test package-lock-root             ... ok
test package-solid-router          ... ok
test package-solid-start           ... ok
test package-solid-testing-library ... ok
test package-vite-only             ... ok
test package-web-only              ... ok

test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```
