# Solid codemod migration loop run: solid-primitives

- Time: 2026-06-26T18:46:59Z
- Job: 52f404fb347c
- Target: solid-primitives
- Mode: manual-compare
- Baseline branch: main
- Manual branch: next
- Temp run dir: /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c
- Lock: acquired normally; no stale lock was encountered.
- End-of-run commit: pending in committed report; final delivery records the actual hash.
- Status: needs-codemod-fix

## Commands

| Command | Exit | Log |
|---|---:|---|
| clone | 0 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/clone.log |
| checkout-main | 0 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/checkout-main.log |
| codemod-run | 0 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/codemod-run.log |
| diff-check | 0 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/diff-check.log |
| install | 0 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/install.log |
| focused-tests | 1 | /tmp/solid-codemod-runs/20260626-184659-solid-primitives-52f404fb347c/focused-tests.log |

Package-level verification after codemod edits: pnpm test exited 0; pnpm check-types exited 0.

## Findings

1. Added fixture-backed test dispatch flushing: Vitest/test-like files now get flush() after dispatchEvent(...) expression statements and a solid-js flush import.
2. In the solid-primitives keyboard test helper, the codemod now inserts one flush() inside dispatchKeyEvent, matching the manual migration pattern more closely without adding repetitive flush calls after every helper invocation.
3. Focused verification still fails 8 assertions. Remaining failures are not solved by dispatchEvent flushing alone and should drive the next fixture: createComputed compatibility reruns / direct createRoot setter flushes / websocket timer scheduling.

## Flush/ownedWrite summary

```json
[
  {
    "file": "packages/keyboard/test/index.test.ts",
    "flush_calls": 1,
    "ownedWrite": 0
  },
  {
    "file": "packages/keyboard/src/index.ts",
    "flush_calls": 0,
    "ownedWrite": 2
  },
  {
    "file": "packages/event-dispatcher/test/index.test.ts",
    "flush_calls": 0,
    "ownedWrite": 1
  },
  {
    "file": "packages/refs/test/index.test.ts",
    "flush_calls": 0,
    "ownedWrite": 1
  },
  {
    "file": "packages/websocket/test/index.test.ts",
    "flush_calls": 1,
    "ownedWrite": 0
  }
]
```

## Diff stat excerpt

```
packages/static-store/test/index.test.ts           |  14 ++-
 packages/storage/package.json                      |   6 +-
 packages/storage/src/cookies.ts                    |   2 +-
 packages/storage/src/persisted.ts                  |  12 ++-
 packages/storage/tauri-storage/package-lock.json   |   5 +-
 packages/storage/tauri-storage/package.json        |   7 +-
 packages/storage/tauri-storage/src/App.tsx         |   2 +-
 packages/storage/tauri-storage/src/index.tsx       |   2 +-
 packages/storage/tauri-storage/tsconfig.json       |   2 +-
 packages/storage/test/persisted.test.ts            |   8 +-
 packages/stream/demo/index.tsx                     |  23 +++--
 packages/stream/dev/index.tsx                      |   7 +-
 packages/stream/package.json                       |   6 +-
 packages/stream/src/index.ts                       |  33 +++---
 packages/stream/test/index.test.ts                 |  12 ++-
 packages/styles/package.json                       |   6 +-
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
 packages/virtual/test/index.test.tsx               |  12 ++-
 packages/virtual/test/server.test.tsx              |   2 +-
 packages/websocket/dev/index.tsx                   |   6 +-
 packages/websocket/package.json                    |   6 +-
 packages/websocket/test/index.test.ts              |   4 +-
 packages/websocket/test/setup.ts                   |   3 +
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
 418 files changed, 3000 insertions(+), 1983 deletions(-)

```

## Focused verification tail

```
     77| 
     78|       dispatchKeyEvent("a", "keydown");
     79|       expect(captured).toBe("A");
       |                        ^
     80| 
     81|       dispatchKeyEvent("a", "keyup");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:71:5

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

 ❯ packages/keyboard/test/index.test.ts:105:24
    103|       // TODO(solid-2): Review createComputed write-back pattern.
    104| createComputed(() => (captured = sequence()));
    105|       expect(captured).toEqual([]);
       |                        ^
    106| 
    107|       dispatchKeyEvent("a", "keydown");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:100:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  packages/keyboard/test/index.test.ts > createKeyHold > returns a boolean of is the wanted key pressed
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ packages/keyboard/test/index.test.ts:138:24
    136|       dispatchKeyEvent("ALT", "keydown");
    137| 
    138|       expect(captured).toBe(true);
       |                        ^
    139| 
    140|       dispatchKeyEvent("a", "keyup");
 ❯ node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:36
 ❯ runWithOwner node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:2244:12
 ❯ Module.createRoot node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1059:10
 ❯ packages/keyboard/test/index.test.ts:129:5

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
   Start at  13:48:04
   Duration  1.47s (transform 326ms, setup 0ms, collect 473ms, tests 59ms, environment 2.43s, prepare 677ms)

```
