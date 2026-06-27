# Solid codemod migration loop run: solid-primitives

- Job: `52f404fb347c`
- Target: `.repos/solid-primitives`
- Mode: `manual-compare`
- Baseline branch: `main`
- Manual branch: `next`
- Run dir: `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c`
- Stale lock encountered/cleared: `no`
- Status: `needs-codemod-fix`
- End-of-run commit: pending at report write time; final delivery records the created commit hash.

## Commands

- registry-search: exit 0, 2.3s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/registry-search.log`
- clone-codemod: exit 0, 0.9s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/clone-codemod.log`
- checkout-codemod-main: exit 0, 0.9s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/checkout-codemod-main.log`
- clone-manual: exit 0, 0.9s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/clone-manual.log`
- checkout-manual-next: exit 0, 0.8s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/checkout-manual-next.log`
- codemod-run: exit 0, 4.7s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/codemod-run.log`
- diff-check-stat: exit 0, 0.8s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/diff-check-stat.log`
- install: exit 0, 5.7s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/install.log`
- focused-fetch-test: exit 1, 72.1s, log `/tmp/solid-codemod-runs/20260627-020759-solid-primitives-createeffect-wrapper-52f404fb347c/focused-fetch-test.log`

Additional package verification after codemod edits:

- `cd codemods/solid-codemod && pnpm test && pnpm check-types`: exit 0
  - Source fixtures: 87 passed
  - JSON fixtures: 12 passed
  - TypeScript: `tsc --noEmit` passed

## Findings

1. `npx codemod@latest search "solid 2"` returned no registry package, so this iteration continued the local codemod feedback loop.
2. The previous `createEffect` handling was unsafe for `solid-primitives/packages/fetch`: direct Solid 2 `createEffect` imports throw `MISSING_EFFECT_FN` for Solid 1 one-argument calls.
3. The codemod now emits a compatibility wrapper for direct `createEffect` imports: it aliases Solid 2 `createEffect` as `__solid2CreateEffect` and adapts `(fn, value, options)` calls while retaining the review TODO.
4. Focused `packages/fetch/test/index.test.ts` now fails differently: `MISSING_EFFECT_FN` is gone, but 14 of 16 tests time out after 5s. This indicates progress but not a completed `solid-primitives` migration.

## Codemod changes

- `codemods/solid-codemod/scripts/source/solid-transform.ts`
- Updated expected fixtures under `codemods/solid-codemod/tests/source/` for createEffect wrapper output.

## Verification summary

- Codemod workflow apply: exit 0
- `git diff --check`: exit 0
- Target `pnpm install --no-frozen-lockfile`: exit 0
- Target focused fetch test: exit 1, 14 timeout failures, 2 passed
- Package `pnpm test`: exit 0
- Package `pnpm check-types`: exit 0

## Next action

Continue `solid-primitives` fetch triage. The next high-value step is to compare `packages/fetch` against the manual `next` branch and inspect whether the remaining timeout is caused by the generated `createResource` compatibility stub, effect scheduling semantics, or a package-level manual migration that should be documented/TODO-marked rather than automated.
