import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findDirectImportedCalls } from "../../../shared/analysis.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#unwrapstore--snapshotstore";

export function analyzeUnwrap(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js/store", "unwrap")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this unwrap call to a reviewed snapshot.
Why: Solid 2.0.0-beta.32 replaces unwrap(store) with snapshot(store) for capturing a point-in-time, non-reactive snapshot of a Solid store, but replacement safety depends on the input, capture time, and every consumer.
Guidance: Read the complete input expression and prove it is a Solid store, then trace every consumer of the unwrap result. Replace unwrap with snapshot from solid-js only after proving that a point-in-time snapshot is intended, and preserve the exact surrounding evaluation point so capture timing and side effects do not move. Make and validate this migration yourself; this analyzer never edits or runs the target project. Stop without proposing a replacement when the input's store provenance is unclear, the current value's object or nested identity is observed, the value is expected to remain live across store updates, the result or nested data is mutated, the result escapes or is passed to code with unknown ownership, or any consumer is unclear. Ask for the smallest focused test or runtime observation that exposes the disputed capture or consumer boundary at this site, such as the result before and after a store update, nested reads, identity, mutation, serialization, or ownership transfer. Official migration guide: ${MIGRATION_GUIDE}`;
    });
}
