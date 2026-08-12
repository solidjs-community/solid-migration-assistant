import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls } from "../../../shared/analysis.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#createresource--async-computations--loading";

export function analyzeCreateResource(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, "solid-js", "createResource")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length >= 1 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this createResource call to async computations with Loading boundaries.
Why: Solid 2 removes createResource; async data fetching uses async computations wrapped in Loading boundaries.
Guidance: Read the complete source, fetcher, options, and every consumer of the resource tuple (data, loading, error, mutate, refetch). Replace with an async computation and wrap the consuming JSX in a Loading boundary whose fallback handles the not-ready state. Track the resource tuple destructuring sites to confirm the replacement covers every field. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${MIGRATION_GUIDE}`;
    });
}
