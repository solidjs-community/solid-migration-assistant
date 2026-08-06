import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  sourceExcerpt,
} from "../../shared/analysis.ts";

export const mergePropsRule = {
  ruleId: "S2-PROPS-001",
  description:
    "Direct mergeProps calls bound to an exact named import from solid-js.",
};

export function analyzeMergeProps(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = findDirectImportedCalls(rootNode, "solid-js", "mergeProps").map(
    ({ call, argumentNodes }) => {
      const range = call.range();
      const line = range.start.line + 1;
      const column = range.start.column + 1;
      return {
        id: `${mergePropsRule.ruleId}:${context.filename}:${line}:${column}`,
        ruleId: mergePropsRule.ruleId,
        title: "Review mergeProps source precedence",
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
          "Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source.",
        evidence: {
          importedName: "mergeProps",
          sourceCount: argumentNodes.length,
          hasSpreadArguments: argumentNodes.some(
            (argument) => argument.kind() === "spread_element",
          ),
          syntax: "direct-call",
        },
        guidance:
          "Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
      };
    },
  );

  return { rule: mergePropsRule, findings };
}
