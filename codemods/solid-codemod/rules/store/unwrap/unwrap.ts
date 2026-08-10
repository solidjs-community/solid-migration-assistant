import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-STORE-UNWRAP-001";
const STORE_MODULE = "solid-js/store";

export function analyzeUnwrap(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, STORE_MODULE, "unwrap")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call }) =>
      siteGuidance(
        call,
        context.filename,
        RULE_ID,
        "Replace this unwrap call with a reviewed snapshot.",
        "Solid 2 replaces unwrap with snapshot for reading a non-reactive snapshot of a reactive store, but consumers can still depend on when the value is captured and whether nested data is later observed or mutated.",
        "Next step: inspect the value passed here and every consumer of the result, then consider snapshot from solid-js only after confirming that a point-in-time value is intended. Preserve the surrounding evaluation point and add a focused test for nested reads or serialization. Stop without proposing a replacement when the input may not be a Solid store, the result is mutated, retained across updates, compared by identity, passed to code with unknown ownership, or expected to remain live. This analyzer does not edit code.",
      ),
    );
}
