import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findDirectImportedCalls } from "../../../shared/analysis.ts";

const MIGRATION_GUIDE = "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#batch--default-microtask-batching--flush";

export function analyzeBatch(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "batch")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this batch call to default microtask batching.
Why: Solid 2 uses microtask batching by default; batch() is removed. Use flush() sparingly when synchronous settlement is required.
Guidance: Read the complete callback and its reactive writes. Remove the batch() wrapper. Verify that no caller depends on synchronous read-after-write inside the batch. Add flush() only where downstream code must observe settled state before the current turn completes. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${MIGRATION_GUIDE}`;
    });
}
