import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findDirectImportedCalls } from "../../../shared/analysis.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#createcomputed--creatememo-createeffect-or-derived-createsignal";

export function analyzeCreateComputed(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "createComputed")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length >= 1 &&
        argumentNodes.length <= 3 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, argumentNodes, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: choose a Solid 2 replacement for this createComputed call.
Why: Solid 2.0.0-beta.32 removes createComputed; the correct replacement depends on whether the callback derives a value, performs an effect, or encodes stateful update logic. This call has ${argumentNodes.length} semantic argument(s).
Guidance: Read the complete callback, its consumers, nearby signal/store declarations, and ordering assumptions. Use createMemo only for a readonly derived value that consumers read. Use Solid 2's split createEffect when reactive reads can be isolated in the compute callback and imperative work belongs in the untracked effect callback. Use function-form createSignal, or derived createStore for object and array projections, only when writable derived state is intentional. Make and validate this migration yourself; this analyzer never edits or runs the target project. Stop without proposing a rewrite when the callback uses its previous value or an initial/options argument, writes to a dependency or may form a cycle, mixes several operations, relies on immediate or render ordering, registers cleanup, starts async work, contains nested control flow or reactive primitive creation, or has unclear ownership or consumers. Ask for the smallest focused test or runtime observation that exposes the required value, timing, and write behavior. Official migration guide: ${MIGRATION_GUIDE}`;
    });
}
