import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-EFFECT-001";

export function analyzeCreateEffect(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "createEffect")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) =>
      siteGuidance(
        call,
        filename,
        RULE_ID,
        "Split this one-argument createEffect.",
        "Solid 2 requires separate compute and effect callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.",
        "Read the full callback, imports, and nearby reactive declarations. Explain the migration by default and edit only when explicitly asked. For the supported plain shape, move reactive reads into the compute callback, return their value, and keep the imperative operation in the effect callback. Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent. Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable.",
      ),
    );
}
