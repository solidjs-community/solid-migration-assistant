# Solid codemod migration loop run: solid-primitives reactive createResource

- Job: 52f404fb347c
- Started: 2026-06-27T02:54:46Z
- Target: .repos/solid-primitives
- Mode: manual-compare
- Baseline branch: main
- Manual branch: next
- Run dir: /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c
- Stale lock encountered/cleared: no
- Status: needs-codemod-fix
- End-of-run commit: pending until git commit is created

## Commands

- registry-search: exit 0, 1s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/registry-search.log
- clone-codemod: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/clone-codemod.log
- checkout-codemod-main: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/checkout-codemod-main.log
- clone-manual: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/clone-manual.log
- checkout-manual-next: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/checkout-manual-next.log
- manual-fetch-diff: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/manual-fetch-diff.log
- codemod-run: exit 0, 3s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/codemod-run.log
- diff-check-stat: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/diff-check-stat.log
- install: exit 0, 5s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/install.log
- focused-fetch-test: exit 1, 11s, log /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/focused-fetch-test.log

## Codemod changes

- scripts/source/solid-transform.ts createResource review stub now imports Solid 2 createEffect/createSignal, stores latest in a signal, reruns when a source accessor changes, supports refetch(value), and preserves the undefined-source guard.
- tests/source/create-resource-reactive-stub added. Existing createResource expected fixtures updated.

## Verification

- Codemod package: pnpm test and pnpm check-types passed: 88 source fixtures, 12 JSON fixtures, tsc pass.
- Target codemod workflow exit: 0
- Target diff check/stat exit: 0
- Target install exit: 0
- Focused fetch test exit: 1, with 13 passed and 3 failed.

## Findings

- Registry discovery with npx codemod@latest search solid 2 found no existing package, so the local codemod iteration continued.
- Manual next branch has no packages/fetch file diff from main, so the remaining behavior is a Solid 2 compatibility gap rather than an obvious manual file migration.
- Reactive createResource stub was a large improvement for solid-primitives fetch: focused test result moved from 14 timeouts to 13 passed and 3 failed.
- Remaining failures are abort flag propagation, request error settling timeout, and cache expiry refetch timeout.

## Focused fetch log tail

[34mTesting ALL packages...[0m

 RUN  v2.1.9 /tmp/solid-codemod-runs/20260627-025446-solid-primitives-reactive-resource-52f404fb347c/codemod

stderr | packages/fetch/test/index.test.ts > fetch primitive > will not start a request with a request info accessor returning undefined
[STRICT_READ_UNTRACKED] Reactive value read directly in an effect callback will not update. Move it into a tracking scope (JSX, a memo, or an effect's compute function).

 ❯ packages/fetch/test/index.test.ts (16 tests | 3 failed) 10037ms
   × fetch primitive > will abort a request without an error 8ms
     → expected false to be true // Object.is equality
   × fetch primitive > will make a request error accessible otherwise 5005ms
     → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
   × fetch primitive > re-fetches after expiry 5002ms
     → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/fetch/test/index.test.ts > fetch primitive > will abort a request without an error
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ packages/fetch/test/index.test.ts:83:27
     81| 
     82|     abort!();
     83|     expect(ready.aborted).toBe(true);
       |                           ^
     84|     expect(ready.error).toEqual(undefined);
     85| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  packages/fetch/test/index.test.ts > fetch primitive > will make a request error accessible otherwise
 FAIL  packages/fetch/test/index.test.ts > fetch primitive > re-fetches after expiry
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed | 13 passed (16)
   Start at  21:55:40
   Duration  10.99s (transform 60ms, setup 0ms, collect 79ms, tests 10.04s, environment 433ms, prepare 98ms)


## Next action

Continue solid-primitives fetch triage: reactive createResource stub reduced focused fetch failures to 3 of 16; inspect abort flag propagation, rejected resource error settling, and cache expiry refetch scheduling.
