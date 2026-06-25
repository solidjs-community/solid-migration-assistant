# Solid Codemod

This context describes the language used to reason about the Solid 1.x to Solid 2 migration codemod.

## Language

**Safe Mechanical Migration**:
A migration whose correct output can be determined from local syntax and documented API moves without inferring application intent.
_Avoid_: Full migration, semantic migration

**Semantic Migration Site**:
A location where Solid 2 changes require human intent or broader program understanding before a safe rewrite can be chosen.
_Avoid_: Safe rewrite, automatic fix

**Review Marker**:
A `TODO(solid-2)` annotation added by the codemod to identify a **Semantic Migration Site** that must be resolved with human review and tests.
_Avoid_: Automatic rewrite, generated fix

**Best-Effort AI Migration**:
A migration mode, explicitly requested by the user, where AI may rewrite **Semantic Migration Sites** after the **Safe Mechanical Migration** pass by using broader project context to infer application intent.
_Avoid_: Safe mechanical migration, guaranteed migration

**Target Profile**:
The package-level classification that determines whether Solid JSX/runtime rewrites should target web, hyperscript, a custom renderer, or renderer-neutral library code.
In **Best-Effort AI Migration**, a **Target Profile** may be inferred from broader project context when local package evidence is ambiguous.
_Avoid_: Project type, app kind

**Migration Report**:
A generated record of migration decisions, evidence, confidence, applied edits, skipped sites, and required verification for a migrated package or workspace.
_Avoid_: Scratch pad, implementation notes

**Role-Aware Dependency Migration**:
A dependency update that places Solid runtime and renderer packages according to whether the package is an application, published library, renderer package, or test/build-only consumer.
_Avoid_: Same-group dependency mirroring, blind dependency update

**Compatibility Manifest**:
The version policy source used by the codemod to choose compatible Solid 2 package ranges and related tooling ranges.
_Avoid_: Hardcoded version string, latest-only dependency update

**Renderer-Owned JSX Type**:
A JSX namespace or helper type whose meaning belongs to a specific Solid renderer package.
_Avoid_: Core JSX type, renderer-neutral type

**Renderer-Neutral Renderable**:
A value that Solid can carry through component trees without committing the public API to a specific renderer.
_Avoid_: JSX element, DOM node

**Flush Boundary**:
A deliberate point in migrated code where queued Solid 2 reactive updates are made visible synchronously.
In Solid 1.x migrations, Solid's `batch` API is safely renamed to `flush` because Solid 2 `flush(fn)` preserves the callback value while synchronously draining queued updates.
_Avoid_: Transaction

**Effect Split**:
The Solid 2 effect shape that separates reactive dependency collection from side-effect application.
_Avoid_: Single-callback effect, automatic effect rewrite

**Initial Prev Migration**:
The rewrite from a Solid 1.x initial value argument to a Solid 2 default value on a computation's `prev` parameter.
_Avoid_: Options migration, initial state migration

**Lifecycle-Aware Migration**:
A migration that accounts for Solid 2 lifecycle scope restrictions, especially cleanup return values and forbidden nested primitive creation inside `onSettled` or `createTrackedEffect` callbacks.
_Avoid_: Lifecycle rename, mount rewrite

**Diagnostic-Driven Migration**:
A migration loop that uses Solid 2 development diagnostics to find and verify behavior-sensitive rewrites that cannot be fully identified from static syntax alone.
_Avoid_: Lint-only migration, manual warning cleanup

**Resource Cluster**:
The connected set of code around a Solid 1.x resource, including its creation, value reads, loading/error checks, refetches, mutations, and UI boundaries.
_Avoid_: Resource call, async helper

**Review-Only Migration Site**:
A **Semantic Migration Site** that the workflow should surface but not rewrite automatically, even in **Best-Effort AI Migration**.
_Avoid_: Unsupported migration, skipped code

**Directive Migration**:
The migration from Solid 1.x `use:` JSX directives to Solid 2 `ref` directive factories and ref composition.
_Avoid_: Ref rename, directive removal

**Verification Loop**:
The phased process of applying migration edits, running project checks, using diagnostics, and narrowing regressions to the migration batch that introduced them.
_Avoid_: Final test run, smoke test only

**Public API Preserving Migration**:
A library migration that updates Solid 2 internals while preserving exported symbols, types, functions, and component contracts unless public API breakage is explicitly enabled.
_Avoid_: Clean rewrite, internal-only migration

## Example Dialogue

Developer: Should the first release cover effect splitting?

Domain Expert: Treat that as a **Semantic Migration Site** unless the local code makes the compute and apply phases unambiguous.

Developer: Then import path changes belong in the **Safe Mechanical Migration** scope.
