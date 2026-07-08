# Solid Codemod Recipe Split Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Split `solid-codemod` into smaller registry-style codemods plus a `solid-v2-migration-recipe`, matching the React/Express/ESLint registry pattern while preserving current behavior and tests.

**Architecture:** Keep each transformation group as an independently publishable codemod package under `codemods/*`. Shared AST/import helpers move into an internal workspace package so individual codemods stay small and testable. The recipe package composes the smaller codemods in a stable order.

**Tech Stack:** Codemod workflow YAML, JSSG TypeScript transforms, pnpm workspace, `codemod jssg test`, TypeScript strict mode.

---

## Current Context

**Repo:** `/home/lucifer/work/active/codemod/solid/solid-codemod`

Current package:

```text
codemods/solid-codemod/
  codemod.yaml
  workflow.yaml
  scripts/codemod.ts
  scripts/json-config.ts
  scripts/source/direct-migrations.ts
  scripts/source/solid-api.ts
  scripts/source/solid-transform.ts
  tests/source/*
  tests/json/*
  agents/skill/solid-codemod/SKILL.md
```

Current workflow has three logical responsibilities:

1. TS/JS/TSX migration via `scripts/codemod.ts` → `scripts/source/solid-transform.ts`.
2. JSON/package/config migration via `scripts/json-config.ts`.
3. Skill installation via `install-skill`.

Current implementation has already grown into multiple conceptual buckets:

- Import/module moves: `solid-js/web` → `@solidjs/web`, `solid-js/h` → `@solidjs/h`, etc.
- Safe API renames: `Suspense` → `Loading`, `mergeProps` → `merge`, etc.
- Renderer/JSX type moves: `JSXElement` → `Element`, renderer-owned types to `@solidjs/web`.
- JSX shape changes: context providers, dynamic components, intrinsic attributes, classlist, error fallback, reveal props.
- Direct runtime migrations: `createMemo`, `createComputed`, `createSelector`, `splitProps`, store setters, cleanup handling, runtime stubs.
- Review markers for semantic migrations: effects, async/resource behavior, scheduler/dev APIs, unsupported props.
- JSON/config/dependency updates.

## Proposed Package Breakdown

Create these publishable codemods:

```text
codemods/
  solid-v2-imports/
  solid-v2-jsx-types/
  solid-v2-jsx-shapes/
  solid-v2-runtime-safe/
  solid-v2-review-markers/
  solid-v2-json-config/
  solid-v2-migration-recipe/
  solid-codemod/              # temporary compatibility wrapper, optional
packages/
  solid-codemod-shared/       # internal helper package, optional but recommended
```

### 1. `solid-v2-imports`

**Scope:** Pure import/module rewrites and safe named import renames.

Examples:

- `solid-js/web` → `@solidjs/web`
- `solid-js/h` → `@solidjs/h`
- `solid-js/html` → `@solidjs/html`
- `solid-js/universal` → `@solidjs/universal`
- `solid-js/store` import consolidation where locally safe
- safe symbol renames from `safeImportRenames` / `webSafeImportRenames`
- preserve collisions and aliases

**Source to extract from:**

- `scripts/source/solid-api.ts`
- import handling in `scripts/source/solid-transform.ts`
- `applyImportEdits` / import collection helpers in `direct-migrations.ts`

**Tests to move/copy first:**

- `tests/source/import-subpaths`
- `tests/source/module-string-literals`
- `tests/source/direct-import-preserve-safe-renames`
- `tests/source/namespace-safe-rewrites`
- `tests/source/named-import-collision`
- `tests/source/separate-import-collision`
- `tests/source/mixed-web-imports`
- `tests/source/aliases`
- `tests/source/shadowed-usage`

### 2. `solid-v2-jsx-types`

**Scope:** Type-only migration of Solid/renderer JSX types.

Examples:

- `JSXElement` → `Element`
- `JSX.Element` / aliased namespace annotation rewrites where locally safe
- renderer-owned `JSX`, `ComponentProps`, `ValidComponent` moved to `@solidjs/web`
- module augmentation updates for renderer JSX

**Source to extract from:**

- `solidTypeRenames`, `rendererTypeNames` in `solid-api.ts`
- type/reference handling in `solid-transform.ts`

**Tests to move/copy first:**

- `tests/source/jsx-element-import`
- `tests/source/jsx-element-alias`
- `tests/source/jsx-element-alias-mixed`
- `tests/source/non-type-jsx-imports`
- `tests/source/renderer-types-inline`
- `tests/source/renderer-validcomponent-direct-import`
- `tests/source/renderer-jsx-module-augmentation`
- `tests/source/forwarded-intrinsic-component-props`

### 3. `solid-v2-jsx-shapes`

**Scope:** JSX and component-shape rewrites that are still local/syntactic.

Examples:

- context provider shape migrations
- dynamic component migration
- `ErrorBoundary` fallback shape handling
- `Reveal`/`SuspenseList` prop adjustments
- intrinsic attribute changes like `tabindex`, readonly attributes, DOM directive review/removal
- classlist computed spread handling
- simple prop destructuring where safe

**Source to extract from:**

- JSX-related branches in `solid-transform.ts`
- JSX helpers in `direct-migrations.ts`, e.g. `rewriteSimplePropDestructuring`, `rewriteDomDirectives`, `rewriteIntrinsicAttributes`

**Tests to move/copy first:**

- `tests/source/context-provider-*`
- `tests/source/create-component-context-provider`
- `tests/source/create-dynamic-*`
- `tests/source/error-boundary-*`
- `tests/source/reveal-props*`
- `tests/source/suspense-list-unsupported-props`
- `tests/source/intrinsic-*`
- `tests/source/dom-directive-review`
- `tests/source/classlist-*`
- `tests/source/prop-destructure-*`

### 4. `solid-v2-runtime-safe`

**Scope:** Runtime/API migrations that rewrite call expressions or install compatibility shims when local behavior can be preserved.

Examples:

- `createMemo` previous-value / options rewrites
- `createComputed` captured/derived patterns
- `createSelector` common form
- `splitProps` rest-only/selected compatibility
- store setter / `produce` / `reconcile` rewrites
- `onMount`/`onCleanup` cleanup rewrites
- `createSignal` owned-write/generic initializer fixes
- testing-library flush helpers
- `createResource` / runtime stubs if kept as local-safe compatibility

**Source to extract from:**

- `scripts/source/direct-migrations.ts`, especially `applyDirectMigrations`
- runtime stub generation sections in `solid-transform.ts`

**Tests to move/copy first:**

- `tests/source/create-memo-*`
- `tests/source/create-computed-*`
- `tests/source/create-selector-common`
- `tests/source/splitprops-*`
- `tests/source/store-*`
- `tests/source/produce-direct-wrapper`
- `tests/source/reconcile-options-review`
- `tests/source/onmount-cleanup*`
- `tests/source/oncleanup-return*`
- `tests/source/create-signal-*`
- `tests/source/owned-write-*`
- `tests/source/create-resource-*`
- `tests/source/removed-runtime-stubs`
- `tests/source/test-*-flush`
- `tests/source/testing-library-render-query-destructuring`

### 5. `solid-v2-review-markers`

**Scope:** Insert comments/markers for migrations that need human intent.

Examples:

- async `createMemo` / effect splitting review
- scheduler/dev/runtime review names
- namespace review-only imports
- unsupported props or semantic behavior changes
- direct review names from `directReviewNames`

**Source to extract from:**

- `reviewOnlyNames`, `webReviewOnlyNames` in `solid-api.ts`
- `directReviewNames` and `insertInlineReviewComments`
- review branches in `solid-transform.ts`

**Tests to move/copy first:**

- `tests/source/review-only*`
- `tests/source/review-effects-memo`
- `tests/source/effect-memo-dynamic-review`
- `tests/source/create-effect-on-array-review`
- `tests/source/async-memo-review`
- `tests/source/review-types-scheduler-dev`
- `tests/source/namespace-review`
- `tests/source/existing-review-marker`
- `tests/source/jsx-render-prop-preserve`

### 6. `solid-v2-json-config`

**Scope:** JSON/package/config updates.

Examples:

- `package.json` dependency ranges for `solid-js`, `@solidjs/router`, `vite-plugin-solid`, testing library, TypeScript, Babel preset
- `jsxImportSource` replacements
- lockfile package entries if still desired
- `tsconfig`/`jsconfig` JSX settings

**Source to extract from:**

- `scripts/json-config.ts`

**Tests to move/copy first:**

- all `tests/json/*`

### 7. `solid-v2-migration-recipe`

**Scope:** Thin orchestration package. No AST transform logic unless absolutely necessary.

Workflow order:

```yaml
version: "1"

nodes:
  - id: solid-v2-migration
    name: Solid v2 Migration
    type: automatic
    steps:
      - name: "Update package/config files for Solid v2"
        codemod:
          source: "solid-v2-json-config"

      - name: "Rewrite Solid package imports and safe API names"
        codemod:
          source: "solid-v2-imports"

      - name: "Move Solid/renderer JSX types"
        codemod:
          source: "solid-v2-jsx-types"

      - name: "Rewrite local-safe JSX/component shapes"
        codemod:
          source: "solid-v2-jsx-shapes"

      - name: "Apply local-safe runtime/API migrations"
        codemod:
          source: "solid-v2-runtime-safe"

      - name: "Insert review markers for semantic migrations"
        codemod:
          source: "solid-v2-review-markers"

  - id: install-package-skill
    name: Install Solid v2 migration skill
    type: automatic
    steps:
      - name: Install package skill
        install-skill:
          package: "solid-v2-migration-recipe"
          path: "./agents/skill/solid-v2-migration/SKILL.md"
```

## Key Design Decisions

### Prefer copy-first, then extract shared helpers

Do **not** start by carving up `solid-transform.ts` surgically. That creates a risky mega-refactor.

Safer sequence:

1. Create a new codemod package.
2. Copy current transform entrypoint and relevant tests into it.
3. Delete unrelated behavior from that package until only that group remains.
4. Run copied tests.
5. Repeat for the next package.
6. Only then extract shared utilities into `packages/solid-codemod-shared`.

This keeps each step verifiable.

### Keep the original package temporarily

Keep `codemods/solid-codemod` for one transition cycle as either:

1. a compatibility recipe that delegates to the new packages, or
2. the old monolith while the new packages stabilize.

Recommended: convert it to a compatibility recipe at the end:

```yaml
steps:
  - codemod:
      source: solid-v2-migration-recipe
```

### Use package names with `solid-v2-*`

Registry naming should make the migration target obvious and avoid generic names like `solid-imports`.

Recommended names:

```text
solid-v2-imports
solid-v2-jsx-types
solid-v2-jsx-shapes
solid-v2-runtime-safe
solid-v2-review-markers
solid-v2-json-config
solid-v2-migration-recipe
```

## Step-by-Step Plan

### Task 1: Snapshot current behavior

**Objective:** Establish a baseline before splitting.

**Files:** none initially.

**Commands:**

```bash
cd /home/lucifer/work/active/codemod/solid/solid-codemod/codemods/solid-codemod
pnpm test
pnpm check-types
```

**Expected:** existing tests/typecheck pass or failures are documented as pre-existing.

**Also capture:**

```bash
git status --short --branch
```

### Task 2: Add root workspace scripts

**Objective:** Make multi-package verification easy from repo root.

**Modify:** `/home/lucifer/work/active/codemod/solid/solid-codemod/package.json`

Change from name-only package to:

```json
{
  "name": "solid-codemod-workspace",
  "private": true,
  "packageManager": "pnpm@10.19.0",
  "scripts": {
    "test": "pnpm -r test",
    "check-types": "pnpm -r check-types",
    "ci": "pnpm run test && pnpm run check-types"
  }
}
```

**Verify:**

```bash
cd /home/lucifer/work/active/codemod/solid/solid-codemod
pnpm run ci
```

### Task 3: Create `solid-v2-json-config`

**Objective:** Split out the JSON/package/config transform first because it is already isolated.

**Create:**

```text
codemods/solid-v2-json-config/
  package.json
  codemod.yaml
  workflow.yaml
  tsconfig.json
  README.md
  scripts/codemod.ts
  tests/json/*
```

**Implementation:** copy `codemods/solid-codemod/scripts/json-config.ts` to `scripts/codemod.ts` and copy all `tests/json/*`.

**Test command:**

```bash
cd /home/lucifer/work/active/codemod/solid/solid-codemod/codemods/solid-v2-json-config
pnpm test
pnpm check-types
```

**Acceptance:** JSON tests pass independently.

### Task 4: Create `solid-v2-imports`

**Objective:** Isolate import/module moves and safe import renames.

**Create:**

```text
codemods/solid-v2-imports/
  package.json
  codemod.yaml
  workflow.yaml
  tsconfig.json
  README.md
  scripts/codemod.ts
  scripts/solid-api.ts
  tests/source/<import-related-fixtures>
```

**Start by copying:**

- `scripts/codemod.ts`
- `scripts/source/solid-transform.ts`
- `scripts/source/direct-migrations.ts` only if required for import helpers
- `scripts/source/solid-api.ts`

Then delete all non-import behavior from the copied entrypoint.

**Test command:**

```bash
pnpm dlx codemod@latest jssg test -l tsx ./scripts/codemod.ts ./tests/source --strictness ast
pnpm check-types
```

**Acceptance:** import-related tests pass; non-import tests are not present.

### Task 5: Create `solid-v2-jsx-types`

**Objective:** Isolate type-only JSX/renderer migrations.

**Create:** same package shape as Task 4.

**Copy fixtures:** JSX type and renderer type tests listed above.

**Implementation rule:** this package should not rewrite runtime calls or insert broad semantic review markers except type-specific review comments.

**Acceptance:** type-focused tests pass independently.

### Task 6: Create `solid-v2-jsx-shapes`

**Objective:** Isolate JSX/component shape changes.

**Copy fixtures:** context provider, dynamic component, error boundary, reveal, intrinsic, classlist, prop destructuring tests.

**Implementation rule:** do not touch JSON config, import-only rewrites, or runtime stubs unless required as local support for a JSX shape rewrite.

**Acceptance:** JSX shape tests pass independently.

### Task 7: Create `solid-v2-runtime-safe`

**Objective:** Isolate direct call/runtime/API rewrites.

**Copy fixtures:** createMemo/createComputed/createSelector/splitProps/store/onCleanup/onMount/createSignal/createResource/testing-library fixtures.

**Implementation rule:** keep compatibility stubs here if they are needed to preserve runtime behavior.

**Acceptance:** runtime-safe tests pass independently.

### Task 8: Create `solid-v2-review-markers`

**Objective:** Isolate comments/TODOs for semantic migrations.

**Copy fixtures:** all review marker tests.

**Implementation rule:** this package should be idempotent: existing review markers must not duplicate.

**Acceptance:** review-marker tests pass independently and idempotency fixture passes.

### Task 9: Extract shared helpers only after packages pass

**Objective:** Remove duplication after behavior is protected.

**Create:**

```text
packages/solid-codemod-shared/
  package.json
  tsconfig.json
  src/solid-api.ts
  src/imports.ts
  src/edits.ts
  src/tree.ts
```

**Modify:** `pnpm-workspace.yaml`

```yaml
packages:
  - "codemods/*"
  - "packages/*"
```

**Use only for stable, cross-package helpers:**

- API maps and sets
- import collection/edit helpers
- text edit utilities
- common AST navigation helpers

**Do not share:** package-specific business logic.

### Task 10: Create `solid-v2-migration-recipe`

**Objective:** Add a thin orchestration package like React/Express/ESLint recipes.

**Create:**

```text
codemods/solid-v2-migration-recipe/
  package.json
  codemod.yaml
  workflow.yaml
  README.md
  scripts/metadata-tests.mjs
```

**Workflow order:** JSON config → imports → JSX types → JSX shapes → runtime-safe → review markers.

**Test:**

```bash
codemod workflow validate --workflow workflow.yaml
node --test ./scripts/metadata-tests.mjs
```

### Task 11: Convert or deprecate `solid-codemod`

**Objective:** Keep backward compatibility for users.

Option A, recommended: convert `codemods/solid-codemod` into a compatibility recipe that delegates to `solid-v2-migration-recipe`.

Option B: keep old monolith with README deprecation note until the new recipe is published.

**Acceptance:** `codemod run solid-codemod` behavior remains equivalent or clearly redirects users.

### Task 12: Run end-to-end verification on target repos

**Objective:** Prove the split recipe still works against dogfood repos.

Use dry runs first:

```bash
cd /home/lucifer/work/active/codemod/solid/solid-codemod
codemod run -w codemods/solid-v2-migration-recipe/workflow.yaml --target .repos/solid-primitives --dry-run
codemod run -w codemods/solid-v2-migration-recipe/workflow.yaml --target .repos/kobalte --dry-run
codemod run -w codemods/solid-v2-migration-recipe/workflow.yaml --target .repos/solid-router --dry-run
```

Then compare against current monolith output on a clean copy if exact equivalence matters.

## Validation Strategy

Run after each package split:

```bash
pnpm test
pnpm check-types
```

Run from root after all packages exist:

```bash
pnpm run ci
```

Validate package shape:

```bash
codemod workflow validate --workflow codemods/solid-v2-migration-recipe/workflow.yaml
```

Optional final registry/package validation via Hermes MCP:

- `validate_codemod_package` for each package directory.

## Risks and Mitigations

### Risk: ordering changes behavior

**Mitigation:** Define recipe order explicitly and add integration fixtures that exercise interactions across imports/types/runtime/review markers.

### Risk: duplicated import edit logic diverges

**Mitigation:** copy-first for safety, then extract stable helpers into `packages/solid-codemod-shared` only after each package has passing tests.

### Risk: review markers duplicate across packages

**Mitigation:** centralize marker text constants and preserve/idempotency tests in `solid-v2-review-markers`.

### Risk: package boundaries are too granular

**Mitigation:** keep six packages, not twenty. The goal is registry-style maintainability, not one codemod per AST pattern.

### Risk: recipe cannot reference unpublished local packages during development

**Mitigation:** during local development, use local workflow paths or run individual package workflows directly. Switch `source:` references to registry names at publish time.

## Definition of Done

- [ ] Root workspace has useful scripts.
- [ ] Each new `solid-v2-*` package has `package.json`, `codemod.yaml`, `workflow.yaml`, README, tests, and typecheck.
- [ ] Current tests are redistributed into package-owned test folders.
- [ ] `solid-v2-migration-recipe` composes the smaller codemods in the documented order.
- [ ] Original `solid-codemod` is either a compatibility recipe or clearly deprecated.
- [ ] Root `pnpm run ci` passes.
- [ ] Dry-run dogfood against at least `solid-primitives`, `kobalte`, and `solid-router` completes or blockers are documented.
