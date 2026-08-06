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
          "Read every source expression and the consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when later sources are known not to provide an own property with value undefined where older sources should win. Stop without proposing a rename when a source can define such an undefined property, uses a spread with unknown runtime contents, is computed dynamically, or relies on fallback-through-undefined behavior. In those cases preserve the intended precedence with an explicit manual rewrite and ask for the smallest focused test that observes the disputed property's value.",
      };
    },
  );

  return { rule: mergePropsRule, findings };
}
