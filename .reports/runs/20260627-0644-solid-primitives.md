# Solid codemod migration loop run: solid-primitives pagination SSR follow-up

Job: 52f404fb347c
Completed: 2026-06-27T06:49:41Z
Target: .repos/solid-primitives
Mode: manual-compare
Baseline branch: main
Manual branch: next
Run dir: /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c
Stale lock encountered/cleared: no
Status: blocked-manual-pagination-migration
End-of-run commit: 5e30a3c5538dc3f0be93e786577cd37054b19c0c

## Commands

- registry-search: exit 0, 1.9s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/registry-search.log
- clone-codemod: exit 0, 0.4s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/clone-codemod.log
- checkout-codemod-main: exit 0, 0.1s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/checkout-codemod-main.log
- clone-manual: exit 0, 0.1s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/clone-manual.log
- checkout-manual-next: exit 0, 0.0s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/checkout-manual-next.log
- manual-pagination-diff: exit 0, 0.0s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/manual-pagination-diff.log
- codemod-run: exit 0, 4.7s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod-run.log
- install: exit 0, 5.8s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/install.log
- diff-check-stat: exit 0, 0.7s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/diff-check-stat.log
- verify-pagination-ssr: exit 1, 7.0s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/verify-pagination-ssr.log
- changed-files: exit 0, 0.0s, log /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/changed-files.log

## Codemod changes

- codemods/solid-codemod/scripts/source/solid-transform.ts: createResource compatibility stubs now import isServer from @solidjs/web and do not start source tracking/refetch execution during SSR. This aligns the compatibility stub with the manual next pagination direction, where infinite-scroll fetching is client-only.
- Updated six source fixture expectations that include the createResource runtime stub: create-resource-error-refetch-stub, create-resource-reactive-stub, create-resource-runtime-stub, create-resource-undefined-source-stub, existing-review-marker, and review-only.

## Verification

- Codemod package verification before target rerun: pnpm test && pnpm check-types passed with 93 source fixtures, 12 JSON fixtures, and tsc --noEmit.
- Registry discovery: pnpm dlx codemod@latest search solid exited 0.
- Target codemod workflow: exit 0.
- Target install: pnpm install --no-frozen-lockfile exit 0.
- Target git diff --check && git diff --stat: exit 0.
- Focused target verification: pnpm --filter @solid-primitives/pagination test:ssr still failed with one timeout in the createInfiniteScroll server test.

## Findings

- The createResource SSR guard did not by itself make the codemodded Solid 1 pagination server test pass.
- Manual next changes both pagination source and packages/pagination/test/server.test.ts: the Solid 1 renderToStringAsync plus Suspense or Loading resource-rerender expectation is replaced by a synchronous createRoot server empty-state assertion.
- This looks unsafe as a broad automatic rewrite without binding and context proof. The codemod already leaves TODO markers around the createResource and createComputed cluster; remaining pagination work should be treated as manual or as a very narrow, well-fixtured migration if the team decides to automate this exact test and source pattern.
- The temporary target worktree is disposable: /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod.

## Manual pagination diff summary

~~~text
packages/pagination/src/index.ts        | 195 ++++++++++++++++++--------------
 packages/pagination/test/server.test.ts |  87 ++++++--------
 2 files changed, 142 insertions(+), 140 deletions(-)
~~~

## Focused SSR tail

~~~text

> @solid-primitives/pagination@0.5.1 test:ssr /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod/packages/pagination
> pnpm run vitest --mode ssr


> @solid-primitives/pagination@0.5.1 vitest /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod/packages/pagination
> vitest -c ../../configs/vitest.config.ts --mode ssr

[34mTesting pagination package...[0m

 RUN  v2.1.9 /tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod/packages/pagination

 ❯ test/server.test.ts (5 tests | 1 failed) 5013ms
   × createInfiniteScroll > createInfiniteScroll 5010ms
     → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/server.test.ts > createInfiniteScroll > createInfiniteScroll
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  01:45:14
   Duration  5.43s (transform 52ms, setup 0ms, collect 74ms, tests 5.01s, environment 0ms, prepare 97ms)

 ELIFECYCLE  Command failed with exit code 1.
/tmp/solid-codemod-runs/20260627-0644-solid-primitives-52f404fb347c/codemod/packages/pagination:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @solid-primitives/pagination@0.5.1 test:ssr: `pnpm run vitest --mode ssr`
Exit status 1
~~~

## Next action

Mark solid-primitives pagination as blocked on manual migration for the createResource/createComputed infinite-scroll cluster and move on to kobalte for new codemod feedback, unless the next iteration is explicitly narrowed to automating this exact pagination server-test/source rewrite.
