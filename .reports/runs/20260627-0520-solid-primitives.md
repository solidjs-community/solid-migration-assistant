# Solid codemod migration loop run: solid-primitives createMemo nested-arrow initial value

- Job: 52f404fb347c
- Completed: 2026-06-27T05:11:25Z
- Target: .repos/solid-primitives
- Mode: manual-compare
- Run dir: /tmp/solid-codemod-runs/20260627-0520-solid-primitives-memo-52f404fb347c
- Stale lock encountered/cleared: no
- Status: needs-codemod-fix
- End-of-run commit: pending at report write time; final delivery records the created commit hash.

## Verification

Codemod package pnpm test passed with 91 source fixtures and 12 JSON fixtures; pnpm check-types passed. Target codemod workflow, install, and git diff check passed. SSR verification improved: the previous createPagination previous-value failures are fixed; remaining failures include context Provider undefined, pagination createInfiniteScroll timeout, and presence server document access.

## Codemod changes

- scripts/source/direct-migrations.ts uses direct callback parameter lookup for createMemo rewrites.
- tests/source/create-memo-array-initial fixture added.

## Next action

Continue solid-primitives triage for createInfiniteScroll/createEffect server behavior, presence document server guard or TODO marker, and context Provider undefined behavior.

## SSR tail

~~~text
solid-js/dist/server.js:163:12
 ❯ node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:260:49
 ❯ runWithOwner node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:81:12
 ❯ run node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:260:23
 ❯ update node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:263:22
 ❯ read node_modules/.pnpm/solid-js@2.0.0-beta.15/node_modules/solid-js/dist/server.js:282:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  packages/pagination/test/server.test.ts > createInfiniteScroll > createInfiniteScroll
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

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

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 Test Files  3 failed | 33 passed | 1 skipped (37)
      Tests  4 failed | 86 passed | 1 todo (95)
   Start at  00:10:56
   Duration  5.92s (transform 3.81s, setup 0ms, collect 7.45s, tests 5.12s, environment 6ms, prepare 2.72s)

 ELIFECYCLE  Command failed with exit code 1.
 ELIFECYCLE  Command failed with exit code 1.

~~~
