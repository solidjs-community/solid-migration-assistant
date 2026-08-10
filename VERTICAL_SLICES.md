# Solid 2 migration analyzer slices

The experimental preview registers six read-only TSX detections. Every match returns one detailed terminal guidance string and never edits the target.

## Implemented detections

1. **Static `solid-js/web` imports — `S2-IMPORT-WEB-001`**
   Detects static ES imports whose source is exactly `solid-js/web` and explains the Solid 2 `@solidjs/web` package move.
2. **Direct `onMount(...)` calls — `S2-LIFECYCLE-001`**
   Detects one-argument calls reached through the exact named `solid-js` binding and explains the `onSettled` lifecycle decision and stop conditions.
3. **Direct `createComputed(...)` calls — `S2-COMPUTED-001`**
   Detects supported non-spread calls through the exact named binding and asks the user to choose among derived-value, effect, or stateful-update replacements based on intent.
4. **Direct `createEffect(...)` calls — `S2-EFFECT-001`**
   Detects one-argument calls through the exact named binding and explains how to investigate Solid 2's compute/effect split.
5. **Legacy `createMemo(...)` initial arguments — `S2-MEMO-001`**
   Detects two- and three-argument calls through the exact named binding and explains why the Solid 1 initial-value position requires behavioral review.
6. **Direct `mergeProps(...)` calls — `S2-PROPS-001`**
   Detects calls through the exact named binding and explains Solid 2 `merge` precedence, identity, and reactivity hazards.

## Deferred work

- `solid-js/store` analysis is deferred until it can be divided into usage-aware rules.
- JavaScript, `.ts` source, aliases, namespaces, re-exports, dynamic imports, `require`, SSR, libraries, monorepos, configuration, dependencies, and cross-file intent are outside the current boundary.
- Automated transforms are roadmap-only and have no executable workflow, command, or implementation in this preview.

## Verification contract

- [x] Use colocated input/expected rule fixtures to prove analyzers return no edits.
- [x] Cover supported syntax plus aliases, namespaces, indirect calls, shadowing, spreads, unsupported arities, and non-Solid imports.
- [x] Run an end-to-end project fixture from a temporary copy and assert exact deterministic terminal order.
- [x] Run analysis twice and compare the complete normalized guidance text.
- [x] Hash every fixture file before analysis and prove analysis changes no files.
- [x] Validate the analyzer package types and workflow schema.
- [x] Keep all executable transforms and generated reporting outside the repository.
