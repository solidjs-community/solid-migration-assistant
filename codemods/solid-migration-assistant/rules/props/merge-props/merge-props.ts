import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-PROPS-001";

export function analyzeMergeProps(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "mergeProps").map(
    ({ call, argumentNodes }) => {
      const spreadDetail = argumentNodes.some(
        (argument) => argument.kind() === "spread_element",
      )
        ? " At least one source is supplied with spread syntax."
        : "";
      return siteGuidance(
        call,
        context.filename,
        RULE_ID,
        "Review mergeProps source precedence.",
        `Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source. This call has ${argumentNodes.length} source argument(s).${spreadDetail}`,
        "Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
      );
    },
  );
}
