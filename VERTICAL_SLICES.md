# Solid 2 migration vertical slices

## 1. `solid-js/store` static imports

- **Status:** Deferred. A module-string-only rewrite is unsafe because Solid 2 removes or renames store exports and changes retained API behavior. Future store work must be split into usage-aware slices.

## 2. Direct `onMount(...)` calls

- **Status:** Implemented as `S2-LIFECYCLE-001` (`agent-guided`, analysis only, no skill).
- **Coverage:** Exact named bindings, one semantic argument, parenthesized callees, comments, cleanup and async examples, and alias/namespace/shadowed/non-Solid/spread exclusions.

## 3. Direct `createComputed(...)` calls

- **Status:** Implemented as `S2-COMPUTED-001` (`agent-guided`, analysis only, no skill).
- **Coverage:** Readonly derivation, side effects, writes, several operations, spreads, parenthesized callees, and alias/namespace/shadowed/non-Solid exclusions.

## 4. Direct `mergeProps(...)` calls

- **Status:** Implemented as `S2-PROPS-001` (`agent-guided`, analysis only, no skill).
- **Coverage:** Plain and possibly-undefined sources, spreads, parenthesized callees, and alias/namespace/shadowed/non-Solid exclusions. Guidance stops when runtime values decide `undefined` precedence.

## 5. Legacy `createMemo` initial arguments

- **Status:** Implemented as `S2-MEMO-001` (`manual`, analysis only, no skill).
- **Coverage:** Two- and three-argument calls, option-shaped initial values, comments, parenthesized callees, and one-/four-argument, spread, alias, namespace, shadowed, and non-Solid exclusions.

## Current verification state

- [x] The committed fixture remains on `solid-js/web`; transformation runs only in a temporary copy.
- [x] Analysis is read-only and reports all six registered rules deterministically.
- [x] Transform remains fixed-point and only rewrites exact static web imports.

## Checklist for every slice

- [x] Cite the pinned Solid `2.0.0-beta.30` source behavior that requires each rule.
- [x] Add one rule ID, route, reason, evidence shape, and self-contained guidance.
- [x] Start from the direct import binding so shadowed and unrelated names do not match.
- [x] Keep aliases, namespaces, JavaScript, SSR, libraries, monorepos, and cross-file reasoning excluded until their own slices.
- [x] Keep analysis read-only: return `null`, aggregate findings in workflow state, and write only under `.codemod-reports/solid-v2/`.
- [x] Update deterministic counts, IDs, bounded excerpts, coverage limits, JSON, and HTML from the same report object.
- [x] Add small positive fixtures and nearby negative cases.
- [x] Prove source hashes do not change during analysis and findings do not cause a failing exit code.
- [x] Keep the existing web transform separate, report-independent, formatting-preserving, overlap-safe, and fixed-point.
- [x] Keep guidance in findings; no skill is installed or invoked.
- [x] Run unit tests, type checks, workflow/package validation, path-safety tests, and the full end-to-end flow.
- [x] Leave the report renderer unchanged, so Chrome report QA is not required.
- [x] Update README coverage limits and the migration roadmap.
