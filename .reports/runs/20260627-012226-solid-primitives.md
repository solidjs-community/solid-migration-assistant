# Solid codemod loop run: solid-primitives createResource undefined-source stub

- Job: 52f404fb347c
- Started: 2026-06-27T01:22:26Z
- Target: solid-primitives
- Mode: manual-compare (main vs next)
- Temp run dir: /tmp/solid-codemod-runs/20260626-fetch-undefined-52f404fb347c
- Stale lock encountered/cleared: no (/tmp/solid-codemod-loop.lock absent when checked)
- Status: needs-codemod-fix
- End-of-run commit: pending in committed report; final delivery records the actual hash.

## Summary

Registry search `npx codemod@latest search "solid 2"` still returned no packages. This iteration fixed one fetch/createResource crash class: the generated Solid 1 createResource review stub now skips fetcher invocation when the source/accessor is undefined.

## Changes

- Updated `scripts/source/solid-transform.ts` createResource stub refetch guard.
- Updated expected fixtures containing that stub.
- Added `tests/source/create-resource-undefined-source-stub/`.

## Verification

- Codemod package: `pnpm test && pnpm check-types` exit 0 (87 source fixtures, 12 JSON fixtures, tsc pass).
- Target codemod workflow: exit 0.
- Target `git diff --check && git diff --stat`: exit 0, 422 files changed.
- Target `pnpm install --no-frozen-lockfile`: exit 0 with expected Solid 2 beta peer warnings.
- Focused fetch Vitest: exit 1, 15 failed / 1 passed. The previous `requestData is not iterable` and `undefined[0]` cache crashes are gone. Remaining failures are mostly timeouts from non-reactive resource review stubs, one timeout/catchAll assertion, and `localStorage is not defined`.

Logs: `/tmp/solid-codemod-runs/20260626-fetch-undefined-52f404fb347c/codemod-run.log`, `diff-check.log`, `install.log`, `focused-fetch-test.log`.

## Next action

Continue solid-primitives fetch triage: design/fixture a safe createResource/resource runtime migration or document these resource-heavy files as manual after eliminating the undefined-source crash class.
