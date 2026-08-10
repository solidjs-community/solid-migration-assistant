import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-PROPS-SPLIT-001";
const SOLID_MODULE = "solid-js";

export function analyzeSplitProps(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, SOLID_MODULE, "splitProps")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length >= 2 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, argumentNodes }) =>
      siteGuidance(
        call,
        context.filename,
        RULE_ID,
        "Review this splitProps tuple before using omit.",
        `Solid 2 replaces splitProps with omit, while this call supplies ${argumentNodes.length - 1} key group(s) and splitProps returns a tuple whose positions and remainder can be consumed differently at each call-site.`,
        "Next step: trace the complete tuple destructuring or other call-site use, list the keys represented by every group, and inspect downstream reads before designing an omit-based migration. Preserve reactive property access and prove how each old tuple member will be produced. Stop without proposing a rewrite when keys are dynamic or overlapping, more than one selected group is consumed, the tuple escapes or is indexed dynamically, rest/reassignment is involved, proxy identity matters, or any consumer is unclear. This analyzer does not edit code.",
      ),
    );
}
