# Solid codemod migration loop run: solid-primitives

- Time: 2026-06-26T17:22:08Z
- Job: 52f404fb347c
- Target: solid-primitives
- Mode: manual-compare
- Baseline branch: main
- Manual branch: next
- Temp run dir: /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c
- Lock: acquired normally; no stale lock was encountered.
- End-of-run commit: pending until commit creation; final delivery records the actual hash.

## Commands

| Command | Exit | Log |
|---|---:|---|
| branches | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/branches.log |
| clone-codemod | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/clone-codemod.log |
| checkout-main | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/checkout-main.log |
| codemod-run | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/codemod-run.log |
| diff-check | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/diff-check.log |
| install | 0 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/install.log |
| focused-ownedwrite-tests | 1 | /tmp/solid-codemod-runs/20260626-172012-solid-primitives-52f404fb347c/focused-ownedwrite-tests.log |

Package-level verification after codemod edits: pnpm test && pnpm check-types exited 0.

## Findings

1. Added ownedWrite insertion for createSignal declarations inside known owned-scope callbacks when their setters are called in that scope.
2. Added support for Solid owner APIs and @solid-primitives/rootless createSingletonRoot.
3. Focused solid-primitives verification still fails, but the previous reactive-write runtime exceptions are gone in the selected subset. Remaining failures are assertion-level semantic scheduling/value propagation differences.

## ownedWrite comparison

~~~json
[
  {
    "file": "packages/event-dispatcher/test/index.test.ts",
    "manual_next_ownedWrite": 1,
    "codemod_ownedWrite": 1,
    "manual_exists": true,
    "codemod_exists": true
  },
  {
    "file": "packages/refs/test/index.test.ts",
    "manual_next_ownedWrite": 1,
    "codemod_ownedWrite": 1,
    "manual_exists": true,
    "codemod_exists": true
  },
  {
    "file": "packages/keyboard/src/index.ts",
    "manual_next_ownedWrite": 0,
    "codemod_ownedWrite": 2,
    "manual_exists": true,
    "codemod_exists": true
  },
  {
    "file": "packages/keyboard/test/index.test.ts",
    "manual_next_ownedWrite": 2,
    "codemod_ownedWrite": 0,
    "manual_exists": true,
    "codemod_exists": true
  },
  {
    "file": "packages/websocket/test/index.test.ts",
    "manual_next_ownedWrite": 0,
    "codemod_ownedWrite": 0,
    "manual_exists": true,
    "codemod_exists": true
  }
]
~~~

## Diff stat excerpt

~~~
es/package.json                       |   6 +-
 packages/styles/src/index.ts                       |   2 +-
 packages/timer/dev/index.tsx                       |   9 +-
 packages/timer/package.json                        |   6 +-
 packages/timer/src/index.ts                        |  24 ++---
 packages/timer/test/index.test.ts                  |   5 +-
 packages/transition-group/dev/list-page.tsx        |  26 ++---
 packages/transition-group/dev/switch-page.tsx      |  33 +++---
 packages/transition-group/package.json             |   6 +-
 packages/transition-group/src/index.ts             |  32 +++---
 .../transition-group/test/list-transition.test.ts  |  13 ++-
 .../test/switch-transition.test.ts                 |  13 ++-
 packages/trigger/package.json                      |   6 +-
 packages/trigger/src/index.ts                      |  10 +-
 packages/trigger/test/index.test.ts                |  28 +++--
 packages/tween/package.json                        |   6 +-
 packages/tween/src/index.ts                        |  12 ++-
 packages/tween/test/index.test.ts                  |   1 +
 packages/upload/package.json                       |   6 +-
 packages/upload/src/createDropzone.ts              |  10 +-
 packages/upload/src/createFileUploader.ts          |   5 +-
 packages/upload/src/index.ts                       |  10 +-
 packages/upload/test/index.test.tsx                |   1 +
 packages/utils/package.json                        |   6 +-
 packages/utils/src/index.ts                        |  29 ++----
 packages/virtual/dev/index.tsx                     |   6 +-
 packages/virtual/package.json                      |   6 +-
 packages/virtual/src/index.tsx                     |  11 +-
 packages/virtual/test/index.test.tsx               |   4 +-
 packages/virtual/test/server.test.tsx              |   2 +-
 packages/websocket/dev/index.tsx                   |   6 +-
 packages/websocket/package.json                    |   6 +-
 packages/websocket/test/index.test.ts              |   1 +
 packages/workers/dev/index.tsx                     |   4 +-
 packages/workers/package.json                      |   6 +-
 packages/workers/src/index.ts                      |  12 ++-
 site/package.json                                  |   2 +-
 site/src/api.ts                                    |   2 +-
 site/src/client.tsx                                |   2 +-
 .../components/BundleSizeModal/BundleSizeModal.tsx |  21 +++-
 site/src/components/Header/Header.tsx              |  44 ++++----
 site/src/components/Header/ThemeBtn.tsx            |  12 ++-
 site/src/components/Icons/Hamburger.tsx            |  26 +++--
 site/src/components/Modal/SlideModal.tsx           |   6 +-
 site/src/components/Primitives/SizeBadge.tsx       |   3 +-
 site/src/components/Primitives/StageBadge.tsx      |  19 +++-
 site/src/components/Search/ClientSearchModal.tsx   |  23 +++--
 site/src/components/Search/Search.tsx              |  29 +++---
 site/src/components/Search/SearchModal.tsx         |   6 +-
 site/src/components/table.tsx                      |  17 +--
 site/src/primitives/client-only.ts                 |  21 ++--
 site/src/primitives/createShortcut.ts              |  26 +++--
 site/src/primitives/document-class.tsx             |   2 +-
 site/src/routes/__root.tsx                         |  12 +--
 site/src/routes/index.tsx                          |   2 +-
 .../$name/-components/package-installation.tsx     |   7 +-
 .../-components/primitive-name-tooltip-impl.tsx    |  18 ++--
 .../$name/-components/primitive-name-tooltips.tsx  |  12 ++-
 site/src/routes/package/$name/index.tsx            |   3 +-
 site/src/routes/playground/$name.tsx               |   8 +-
 template/package.json                              |   6 +-
 template/src/index.ts                              |   9 +-
 template/test/index.test.ts                        |   1 +
 tsconfig.json                                      |   2 +-
 413 files changed, 2927 insertions(+), 1973 deletions(-)

~~~

## Focused verification tail

~~~
5/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:47:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  packages/keyboard/test/index.test.ts > useCurrentlyHeldKey > returns currently held key
AssertionError: expected null to be 'A' // Object.is equality

- Expected: 
"A"

+ Received: 
null

 ❯ packages/keyboard/test/index.test.ts:78:24
     76| 
     77|       dispatchKeyEvent("a", "keydown");
     78|       expect(captured).toBe("A");
       |                        ^
     79| 
     80|       dispatchKeyEvent("a", "keyup");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:70:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  packages/keyboard/test/index.test.ts > useKeyDownSequence > returns sequence of pressing currently held keys
AssertionError: expected [ [ 'A', 'ALT' ] ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   Array [
+     "A",
+     "ALT",
+   ],
+ ]

 ❯ packages/keyboard/test/index.test.ts:104:24
    102|       // TODO(solid-2): Review createComputed write-back pattern.
    103| createComputed(() => (captured = sequence()));
    104|       expect(captured).toEqual([]);
       |                        ^
    105| 
    106|       dispatchKeyEvent("a", "keydown");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:99:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  packages/keyboard/test/index.test.ts > createKeyHold > returns a boolean of is the wanted key pressed
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ packages/keyboard/test/index.test.ts:137:24
    135|       dispatchKeyEvent("ALT", "keydown");
    136| 
    137|       expect(captured).toBe(true);
       |                        ^
    138| 
    139|       dispatchKeyEvent("a", "keyup");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:128:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/8]⎯

 FAIL  packages/refs/test/index.test.ts > resolveElements > returned signals reflect changes to source
AssertionError: expected [ <span></span>, <div></div>, …(1) ] to deeply equal [ <span></span>, <div></div>, …(2) ]

- Expected
+ Received

  Array [
    <span />,
    <div />,
    <svg />,
-   <h1 />,
  ]

 ❯ packages/refs/test/index.test.ts:51:21
     49| 
     50|       setSource(p => [...p, el4]);
     51|       expect(els()).toEqual([el2, el1, el3, el4]);
       |                     ^
     52| 
     53|       setSource(p => removeItems(p, el1, el2, undefined));
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/refs/test/index.test.ts:43:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/8]⎯

 FAIL  packages/websocket/test/index.test.ts > createWSState > reacts to all changes of readyState
AssertionError: expected +0 to deeply equal 1

- Expected
+ Received

- 1
+ 0

 ❯ packages/websocket/test/index.test.ts:65:25
     63|         expect(state()).toEqual(ws.CONNECTING);
     64|         vi.advanceTimersByTime(20);
     65|         expect(state()).toEqual(ws.OPEN);
       |                         ^
     66|         vi.advanceTimersByTime(100);
     67|         ws.close();
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/websocket/test/index.test.ts:60:7
 ❯ packages/websocket/test/index.test.ts:59:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯

 Test Files  4 failed (4)
      Tests  8 failed | 9 passed (17)
   Start at  12:20:22
   Duration  1.01s (transform 178ms, setup 0ms, collect 260ms, tests 45ms, environment 1.79s, prepare 490ms)


~~~

## Status

Status remains needs-codemod-fix. Next action: triage the remaining focused semantic scheduling failures and compare manual next changes beyond ownedWrite.
