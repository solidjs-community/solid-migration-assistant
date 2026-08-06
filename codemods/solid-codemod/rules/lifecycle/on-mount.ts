import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  sourceExcerpt,
} from "../../shared/analysis.ts";

export const onMountRule = {
  ruleId: "S2-LIFECYCLE-001",
  description:
    "Direct one-argument onMount calls bound to an exact named import from solid-js.",
};

export function analyzeOnMount(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = findDirectImportedCalls(rootNode, "solid-js", "onMount")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 && argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call }) => {
      const range = call.range();
      const line = range.start.line + 1;
      const column = range.start.column + 1;
      return {
        id: `${onMountRule.ruleId}:${context.filename}:${line}:${column}`,
        ruleId: onMountRule.ruleId,
        title: "Review this onMount lifecycle callback",
        route: "agent-guided" as const,
        confidence: "high" as const,
        location: {
          file: context.filename,
          line,
          column,
          endLine: range.end.line + 1,
          endColumn: range.end.column + 1,
        },
        excerpt: sourceExcerpt(context.source, range.start.line, range.end.line),
        reason:
          "Solid 2 removes onMount and replaces its lifecycle role with onSettled, but the correct migration depends on the callback's work and ownership.",
        evidence: {
          importedName: "onMount",
          argumentCount: 1,
          syntax: "direct-call",
        },
        guidance:
          "Read the full callback, its owner, and nearby cleanup registration. Explain the migration by default and edit only when explicitly asked. For a plain synchronous callback with clear ownership, consider replacing onMount with onSettled. Stop without proposing a rewrite when the callback registers cleanup, starts async work, contains nested control flow that changes lifecycle behavior, creates reactive primitives, or has unclear ownership. Ask for the smallest focused test or runtime observation that makes the required timing and cleanup behavior observable.",
      };
    });

  return { rule: onMountRule, findings };
}
