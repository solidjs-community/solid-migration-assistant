import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls } from "../../../shared/analysis.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup";

export function analyzeOnCleanup(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "onCleanup")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this onCleanup call to a returned cleanup function.
Why: Solid 2 effects and onSettled use returned cleanup functions instead of the onCleanup registration helper.
Guidance: Read the cleanup callback and the enclosing effect or lifecycle scope. Move the cleanup logic into a function returned from the enclosing createEffect apply callback or onSettled callback. Remove the onCleanup wrapper. Make and validate this migration yourself; this analyzer never edits or runs the target project. Stop without proposing a rewrite when the enclosing scope is unclear, onCleanup is called outside an effect or lifecycle, or the cleanup has dependencies that would change semantics when lifted into a return. Ask for the smallest focused test or runtime observation that proves the enclosing scope and cleanup timing. Official migration guide: ${MIGRATION_GUIDE}`;
    });
}
