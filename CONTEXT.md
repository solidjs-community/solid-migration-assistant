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

## Example Dialogue

Developer: Should the first release cover effect splitting?

Domain Expert: Treat that as a **Semantic Migration Site** unless the local code makes the compute and apply phases unambiguous.

Developer: Then import path changes belong in the **Safe Mechanical Migration** scope.
