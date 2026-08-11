import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const RULE_ID = "S2-LIFECYCLE-001";

export function analyzeOnMount(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "onMount")
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
        "Review this onMount lifecycle callback.",
        "Solid 2 removes onMount and replaces its lifecycle role with onSettled, but the correct migration depends on the callback's work and ownership.",
        "Read the full callback, its owner, and nearby cleanup registration. Explain the migration by default and edit only when explicitly asked. For a plain synchronous callback with clear ownership, consider replacing onMount with onSettled. Stop without proposing a rewrite when the callback registers cleanup, starts async work, contains nested control flow that changes lifecycle behavior, creates reactive primitives, or has unclear ownership. Ask for the smallest focused test or runtime observation that makes the required timing and cleanup behavior observable.",
      ),
    );
}
