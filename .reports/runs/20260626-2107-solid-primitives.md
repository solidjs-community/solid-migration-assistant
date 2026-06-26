# Solid codemod loop run: solid-primitives broader verification

- Job: `52f404fb347c`
- Started: 2026-06-26T21:07:27Z
- Target: `solid-primitives`
- Mode: `manual-compare`
- Baseline branch: `main`
- Manual branch: `next`
- Temp run dir: `/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c`
- Stale lock cleared: `False`
- Status: `needs-codemod-fix`
- Next action: Triage one broad solid-primitives failure into a minimal fixture/fix; recommended next target is ownedWrite wrapping for makeEventListener-style callbacks or script-loader selected-prop splitProps review behavior.

## Commands

- clone-codemod: exit=0 seconds=1.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/clone-codemod.log
- checkout-codemod: exit=0 seconds=0.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/checkout-codemod.log
- clone-manual: exit=0 seconds=0.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/clone-manual.log
- checkout-manual: exit=0 seconds=0.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/checkout-manual.log
- codemod-run: exit=0 seconds=5.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/codemod-run.log
- install: exit=0 seconds=6.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/install.log
- test: exit=1 seconds=46.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/test.log
- build: exit=1 seconds=7.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/build.log
- diff-check: exit=0 seconds=0.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/diff-check.log
- diff-stat: exit=0 seconds=0.0 log=/tmp/solid-codemod-runs/20260626-210727-solid-primitives-broader-52f404fb347c/diff-stat.log

## Findings

- Broader solid-primitives `pnpm test` failed after codemod output: 81 failed files, 379 failed tests, and 19 errors in the full workspace test run.
- Representative runtime failures are Solid 2 owned-write errors from event callbacks outside the focused package set (`page-visibility`, `connectivity`), an invalid cleanup return from `lifecycle/createIsMounted`, a store setter error in `devices`, and an unsafe `splitProps` selected-prop case in `script-loader`.
- Broader `pnpm build` failed with many Solid 2 API/type migration gaps, including removed types (`MergeProps`, `SetStoreFunction`, `JSX` from solid-js), missing private internals (`solid-js/types/reactive/signal.js`, `$RAW`, `Dev.registerGraph`), and createSignal/createMemo overload changes.
- git diff --check passed, so the current failures are semantic/type migration gaps rather than whitespace corruption.
- No codemod implementation change was made in this bounded iteration; the next loop should target one minimal high-value fixture/fix such as page-visibility/connectivity ownedWrite wrapping or script-loader selected-prop `splitProps` review behavior.

## Codemod package changes

No codemod package edits were made in this iteration; this run broadened solid-primitives verification and identified the next semantic migration gaps.

## Commit

End-of-run commit: `7f8b9c3`.
