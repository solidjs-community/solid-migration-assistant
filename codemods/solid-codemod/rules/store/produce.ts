import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../shared/analysis.ts";

const RULE_ID = "S2-STORE-PRODUCE-001";
const STORE_MODULE = "solid-js/store";

export function analyzeProduce(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, STORE_MODULE, "produce")
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
        "Review removal of this produce wrapper.",
        "Solid 2 removes produce wrappers because store setters are draft-first and accept the mutation callback directly, but removing a wrapper is safe only when this value is used in that setter role.",
        "Next step: inspect the immediate parent call, identify the exact store setter overload and path arguments, and review the full mutation callback before passing that callback directly to the setter. For nested produce calls, review each wrapper and its containing setter independently. Stop without proposing wrapper removal when the result is stored, returned, composed, passed through another function, used with a non-store setter, or when callback returns, nested control flow, async work, external mutation, or target ownership make draft behavior unclear. This analyzer does not edit code.",
      ),
    );
}
