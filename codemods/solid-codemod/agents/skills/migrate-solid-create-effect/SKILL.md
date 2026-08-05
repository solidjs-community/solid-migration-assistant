---
name: migrate-solid-create-effect
description: Explain or implement the narrow Solid 1 to Solid 2 migration for a reported S2-EFFECT-001 direct one-argument createEffect call. Use when a Solid migration report points to this rule and the callback may be a simple reactive read followed by one imperative side effect; stop and escalate more complex effect behavior.
---

# Migrate Solid createEffect

Handle one reported `S2-EFFECT-001` site at a time.

## Workflow

1. Read the full callback, its imports, and nearby reactive declarations.
2. Read [references/plain-effect.md](references/plain-effect.md).
3. Decide whether the callback matches the supported plain shape.
4. Explain the split by default. Do not edit unless the user asks for a change.
5. When asked to edit, change only the reported effect and any directly required local names.
6. Run the narrowest available type check and focused test. Report the checks and any unresolved risk.

## Required stop conditions

Stop without proposing a concrete rewrite when the effect contains cleanup, `async` or `await`, nested control flow that changes which values are read, creation of reactive primitives, several unrelated operations, writes that may affect its own inputs, or unclear application intent.

When stopping, identify the missing behavior decision and suggest the smallest test that would make the decision observable. Do not widen the task to other migration findings.
