# Solid codemod migration loop run: solid-primitives

- Time: 2026-06-26T16:38:00Z
- Repo processed: `solid-primitives`
- Mode: `manual-compare`
- Default branch/ref: `main`
- Manual branch/ref: `next`
- Temp run dir: `/tmp/solid-codemod-runs/20260626-163404-solid-primitives`
- Lock: acquired; no stale lock was cleared.
- End-of-run commit: `eac2a3a`

## Commands and results

| Command | Exit |
|---|---:|
| `git worktree add --detach <baseline> main` | 0 |
| `git worktree add --detach <codemod> main` | 0 |
| `git worktree add --detach <manual> next` | 0 |
| `pnpm dlx codemod@latest workflow run -w workflow.yaml --target <codemod> --no-interactive` | 0 |
| `git diff --check` | 0 |
| `pnpm install --no-frozen-lockfile` | 0 |
| `pnpm run test` | 134 |
| `cd codemods/solid-codemod && pnpm test && pnpm check-types` | 0 |

## Verification summary

- Codemod workflow completed successfully and changed 414 files in the disposable `solid-primitives` worktree.
- `git diff --check` now exits 0 after fixing class/classList multiline attribute removal.
- Dependency install completed, but with Solid 2 peer warnings from current ecosystem packages (`@solidjs/start`, `@tanstack/solid-router`, devtools/primitives dependencies, etc.).
- Target verification `pnpm run test` still fails with exit 134. The previous `mergeProps` self-reference failure is fixed; remaining failures include many Solid 2 semantic/runtime test failures and an eventual Vitest/Node OOM after 400+ failures.

## Findings fed back into codemod

1. **Bug: removing multiline `classList` attributes left whitespace-only JSX attribute lines.**
   - Symptom: `git diff --check` reported trailing whitespace in many files after class/classList merging.
   - Fix: added AST-selected attribute removal that expands to the whole whitespace-only attribute line, with fixture `tests/source/classlist-multiline-remove`.

2. **Bug: safe import rename `mergeProps -> merge` collided with a local `const merge`.**
   - Symptom: transformed `packages/props/src/combineProps.ts` previously produced `const merge = merge(...sources)`, causing `ReferenceError: Cannot access 'merge2' before initialization` in tests.
   - Fix: detect non-import local bindings for replacement names and emit aliases like `import { merge as mergeProps }` while preserving old local usages, with fixture `tests/source/mergeprops-local-collision`.

3. **Remaining target failures are semantic/out-of-scope for this bounded iteration.**
   - Examples from latest verification: virtual list rendering assertions, websocket timer/state assertion, many `[REACTIVE_WRITE_IN_OWNED_SCOPE]` errors, and final Node OOM.
   - Next loop should triage a small focused subset rather than full-suite noise; likely start with owned-write failures or compare manual `next` changes around affected packages.

## Focused diff confirmation

```diff
diff --git a/packages/props/src/combineProps.ts b/packages/props/src/combineProps.ts
index 2412ddf2..bc488bb7 100644
--- a/packages/props/src/combineProps.ts
+++ b/packages/props/src/combineProps.ts
@@ -1,4 +1,5 @@
-import { type JSX, mergeProps, type MergeProps } from "solid-js";
+import { merge as mergeProps, type MergeProps } from "solid-js";
+import type { JSX } from "@solidjs/web";
 import { access, chain, reverseChain, type MaybeAccessor } from "@solid-primitives/utils";
 import { propTraps } from "./propTraps.js";
```

## Verification log tail

```text
    255| 
    256|     expect(ROOT.querySelector("#item-996")).toBeNull();
    257|     expect(ROOT.querySelector("#item-997")).not.toBeNull();
       |                                                 ^
    258|     expect(ROOT.querySelector("#item-998")).not.toBeNull();
    259|     expect(ROOT.querySelector("#item-999")).not.toBeNull();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[444/491]⎯

 FAIL  packages/virtual/test/index.test.tsx > VirtualList > renders `overscanCount` rows above and below the visible rendered items
AssertionError: expected null not to be null
 ❯ packages/virtual/test/index.test.tsx:281:47
    279| 
    280|     expect(ROOT.querySelector("#item-7")).toBeNull();
    281|     expect(ROOT.querySelector("#item-8")).not.toBeNull();
       |                                               ^
    282|     expect(ROOT.querySelector("#item-9")).not.toBeNull();
    283|     expect(ROOT.querySelector("#item-10")).not.toBeNull();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[445/491]⎯

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

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[446/491]⎯

⎯⎯⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯⎯⎯

Vitest caught 33 unhandled errors during the test run.
This might cause false positive tests. Resolve unhandled errors to make sure your tests are not affected.

⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
Error: [REACTIVE_WRITE_IN_OWNED_SCOPE] Writing to reactive state inside an owned scope (component, computation) is not allowed. Move the write outside or set the `ownedWrite` option if this is intentional.
 ❯ notifyStatus node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1393:13
 ❯ recompute node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:1623:5
 ❯ runHeap node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:870:41
 ❯ GlobalQueue.flush node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:422:7
 ❯ flush node_modules/.pnpm/@solidjs+signals@2.0.0-beta.15/node_modules/@solidjs/signals/dist/dev.js:716:17
 ❯ processTicksAndRejections node:internal/process/task_queues:104:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

<--- Last few GCs --->

[562875:0x194ea000]    62669 ms: Scavenge (interleaved) 2033.4 (2042.4) -> 2028.8 (2044.1) MB, pooled: 0 MB, 11.99 / 0.00 ms  (average mu = 0.340, current mu = 0.300) allocation failure; 
[562875:0x194ea000]    63455 ms: Mark-Compact (reduce) 2029.0 (2044.1) -> 2028.4 (2030.6) MB, pooled: 0 MB, 696.36 / 0.00 ms  (+ 8.7 ms in 3 steps since start of marking, biggest step 4.1 ms, walltime since start of marking 708 ms) (average mu = 0.285, cu
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 0x744ae8 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node (vitest)]
 2: 0xc1a4b0  [node (vitest)]
 3: 0xc1a59f  [node (vitest)]
 4: 0xebdda5  [node (vitest)]
 5: 0xebddd2  [node (vitest)]
 6: 0xebe0ca  [node (vitest)]
 7: 0xecedca  [node (vitest)]
 8: 0xed3170  [node (vitest)]
 9: 0x19655d1  [node (vitest)]
Aborted (core dumped)
 ELIFECYCLE  Command failed with exit code 134.
 ELIFECYCLE  Test failed. See above for more details.
```
