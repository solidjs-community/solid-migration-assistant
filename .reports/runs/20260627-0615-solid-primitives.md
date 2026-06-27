# Solid codemod migration loop run: solid-primitives SSR feedback

Job: 52f404fb347c
Completed: 2026-06-27T06:15:00Z
Target: .repos/solid-primitives
Mode: manual-compare
Baseline branch: main
Manual branch: next
Run dir: /tmp/solid-codemod-runs/20260627-0615-solid-primitives-52f404fb347c
Stale lock encountered/cleared: no active prior lock; short acquisition metadata was stale and cleared during stepped processing
Status: needs-codemod-fix
End-of-run commit: final delivery records the amended commit hash

Verification:
- codemod search solid: exit 0, no packages found.
- Codemod package before target rerun: pnpm test and pnpm check-types passed with 92 source fixtures and 12 JSON fixtures.
- First focused target run after createEffect guard: presence SSR passed; context and createInfiniteScroll failed.
- Codemod package after context Provider member-expression patch: pnpm test and pnpm check-types passed with 93 source fixtures and 12 JSON fixtures.
- Fresh target worktree codemod workflow completed in 3.0s.
- pnpm install --no-frozen-lockfile completed for 87 workspace projects with existing Solid 1-era peer warnings.
- git diff --check passed.
- Focused SSR command failed with one remaining failure: packages/pagination/test/server.test.ts createInfiniteScroll timed out at 5000ms. Presence and context SSR tests passed.

Findings:
- Generated createEffect compatibility stubs imported Solid 2 createEffect and executed on the server, causing previous document is not defined failures in presence SSR. Guarding the stub with @solidjs/web isServer fixed those presence failures.
- Same-file Solid context providers used as value-position member expressions, for example [Ctx2.Provider, World], were not rewritten by the existing JSX-only provider migration. Rewriting same-file Ctx.Provider member expressions outside JSX to Ctx fixed the MultiProvider server failure.
- Remaining pagination failure is semantic: manual next replaces the createResource(page, fetcher) and createComputed infinite-scroll cluster with explicit client-only fetching state and createEffect. This should be triaged conservatively rather than as a broad automatic rewrite.

Codemod changes:
- codemods/solid-codemod/scripts/source/solid-transform.ts: generated createEffect compatibility stubs now import isServer from @solidjs/web and no-op under SSR.
- codemods/solid-codemod/scripts/source/solid-transform.ts: same-file createContext member expressions like Ctx.Provider are rewritten outside JSX tag names.
- Added tests/source/create-effect-server-guard and tests/source/context-provider-member-expression.
- Updated existing createEffect runtime-stub expected fixtures for the new SSR guard import and runtime.

Next action:
Continue solid-primitives pagination triage. The remaining focused failure is createInfiniteScroll timeout; likely next step is to add a conservative fixture/TODO or documented manual migration for createResource plus createComputed infinite-scroll clusters, unless a narrower binding-safe automation can be proven.

Focused SSR tail:
context server test passed; presence server tests passed; pagination createInfiniteScroll server test timed out after 5000ms.
