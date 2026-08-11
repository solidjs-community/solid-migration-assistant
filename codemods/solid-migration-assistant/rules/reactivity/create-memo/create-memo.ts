import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-MEMO-001";

export function analyzeCreateMemo(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "createMemo")
    .filter(
      ({ argumentNodes }) =>
        (argumentNodes.length === 2 || argumentNodes.length === 3) &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, argumentNodes, filename }) =>
      siteGuidance(
        call,
        filename,
        RULE_ID,
        "Manual review required: migrate this createMemo initial value.",
        `Solid 1 uses createMemo's second argument as an initial value${argumentNodes.length === 3 ? " and its third argument as options" : ""}, while Solid 2 uses the second argument for options and has no initial-value parameter.`,
        "Migrate this call manually. First establish why the callback needs the initial value and what it must receive on its first run. Remove the legacy initial-value argument only after preserving that behavior explicitly in surrounding state or callback logic. For a three-argument call, review the legacy options object separately and move only still-supported Solid 2 options into the new second-argument position. An option-shaped second argument is still treated as a Solid 1 initial value in this migration scope. Do not perform a positional rewrite without a focused test that observes the first computed value and subsequent updates.",
      ),
    );
}
