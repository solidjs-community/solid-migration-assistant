# Solid codemod migration loop run: solid-primitives createResource error/refetch

- Job: 52f404fb347c
- Started: 2026-06-27T03:42:42Z
- Target: .repos/solid-primitives
- Mode: manual-compare
- Baseline branch: main
- Manual branch: next
- Run dir: /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c
- Stale lock encountered/cleared: no
- Status: needs-codemod-fix
- End-of-run commit: pending in committed report; final delivery contains commit hash

## Commands

- registry-search: exit 2, 1s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/registry-search.log
- codemod-package-test: exit 0, 3s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-package-test.log
- codemod-package-check-types: exit 0, 1s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-package-check-types.log
- clone-codemod: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/clone-codemod.log
- checkout-codemod-baseline: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/checkout-codemod-baseline.log
- clone-manual: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/clone-manual.log
- checkout-manual: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/checkout-manual.log
- manual-fetch-diff: exit 128, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/manual-fetch-diff.log
- codemod-run: exit 0, 4s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-run.log
- install: exit 0, 9s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/install.log
- diff-check-stat: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/diff-check-stat.log
- focused-fetch-test: exit 1, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/focused-fetch-test.log

## Codemod changes

- Updated createResource compatibility stub with reactive error/loading signals, synchronous initial run for abort(), and sourced refetch(info) semantics.
- Updated 5 source fixture expectations for the createResource stub.
- Added create-resource-error-refetch-stub fixture for reactive error/loading reads and refetch(info).

## Verification

- Codemod package pnpm test exit 0; pnpm check-types exit 0.
- Target codemod workflow exit 0; install exit 0; diff-check/stat exit 0; focused fetch test exit 1.

## Findings

- Codemod package tests and typecheck passed after fixture/transform changes.
- solid-primitives packages/fetch focused Solid 2 test still fails; see focused-fetch-test log tail in report.

## Focused fetch log tail

```
$ pnpm exec vitest -c ./configs/vitest.config.solid2.ts packages/fetch/test/index.test.ts --run
# cwd: /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod

✘ [ERROR] Could not resolve "/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/configs/vitest.config.solid2.ts"

failed to load config from /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/configs/vitest.config.solid2.ts

⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error: Build failed with 1 error:
error: Could not resolve "/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/configs/vitest.config.solid2.ts"
    at failureErrorWithLog (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:1472:15)
    at /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:945:25
    at runOnEndCallbacks (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:1315:45)
    at buildResponseToResult (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:943:7)
    at /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:970:16
    at responseCallbacks.<computed> (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:622:9)
    at handleIncomingPacket (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:677:12)
    at Socket.readFromStdout (/tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod/node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/lib/main.js:600:7)
    at Socket.emit (node:events:509:28)
    at addChunk (node:internal/streams/readable:563:12) {
  errors: [Getter/Setter],
  warnings: [Getter/Setter]
}




```

## Codemod package test tail

```
              ... ok
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
test store-path-compat                     ... ok
test store-path-reconcile                  ... ok
test suspense-list-unsupported-props       ... ok
test test-close-flush                      ... ok
test test-dispatch-event-flush             ... ok
test test-event-dispatcher-flush           ... ok
test test-flush-direct-import-collision    ... ok
test test-flush-scheduling                 ... ok
test web-internals                         ... ok

test result: ok. 89 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s


> solid-codemod@0.1.0 test:json /home/lucifer/work/active/codemod/solid/solid-codemod/codemods/solid-codemod
> pnpm dlx codemod@latest jssg test -l json ./scripts/json-config.ts ./tests/json --strictness ast

(node:1037084) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
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

## Next action

Continue solid-primitives fetch triage from focused-fetch-test failures.

## Post-commit correction / verification update

- Added ownedWrite: true to createResource compatibility stub signals so synchronous initial/refetch writes are legal inside Solid owned scopes.
- Post-fix codemod package pnpm test exit 0; pnpm check-types exit 0.
- Post-fix target codemod workflow exit 0; install exit 0; diff-check/stat exit 0; focused fetch test exit 0.
- Corrected the verification command to use configs/vitest.config.ts; the earlier solid2 config path does not exist after migration.
- Post-fix focused fetch test passed.

### Post-fix commands

- codemod-package-test-ownedwrite: exit 0, 3s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-package-test-ownedwrite.log
- codemod-package-check-types-ownedwrite: exit 0, 1s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-package-check-types-ownedwrite.log
- clone-codemod-ownedwrite: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/clone-codemod-ownedwrite.log
- checkout-codemod-ownedwrite: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/checkout-codemod-ownedwrite.log
- codemod-run-ownedwrite: exit 0, 3s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-run-ownedwrite.log
- install-ownedwrite: exit 0, 6s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/install-ownedwrite.log
- diff-check-stat-ownedwrite: exit 0, 0s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/diff-check-stat-ownedwrite.log
- focused-fetch-test-ownedwrite: exit 0, 1s, log /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/focused-fetch-test-ownedwrite.log

### focused-fetch-test-ownedwrite tail

```
$ pnpm exec vitest -c ./configs/vitest.config.ts packages/fetch/test/index.test.ts --run
# cwd: /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-ownedwrite

[34mTesting ALL packages...[0m

 RUN  v2.1.9 /tmp/solid-codemod-runs/20260627-034242-solid-primitives-resource-refetch-52f404fb347c/codemod-ownedwrite

stderr | packages/fetch/test/index.test.ts > fetch primitive > will not start a request with a request info accessor returning undefined
[STRICT_READ_UNTRACKED] Reactive value read directly in an effect callback will not update. Move it into a tracking scope (JSX, a memo, or an effect's compute function).

 ✓ packages/fetch/test/index.test.ts (16 tests) 17ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  22:47:14
   Duration  1.06s (transform 55ms, setup 0ms, collect 65ms, tests 17ms, environment 547ms, prepare 101ms)


```

Updated status: needs-target-verification

Updated next action: Run broader solid-primitives verification (test:client/test:ssr or build) before marking successful; then proceed to kobalte.
