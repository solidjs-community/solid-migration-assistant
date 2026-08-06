import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  sourceExcerpt,
} from "../../shared/analysis.ts";

export const createEffectRule = {
  ruleId: "S2-EFFECT-001",
  description:
    "Direct one-argument createEffect calls bound to an exact named import from solid-js.",
};

export function analyzeCreateEffect(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = findDirectImportedCalls(rootNode, "solid-js", "createEffect")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 && argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call }) => {
      const range = call.range();
      const line = range.start.line + 1;
      const column = range.start.column + 1;
      return {
        id: `${createEffectRule.ruleId}:${context.filename}:${line}:${column}`,
        ruleId: createEffectRule.ruleId,
        title: "Split this one-argument createEffect",
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
          "Solid 2 requires separate compute and effect callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.",
        evidence: {
          importedName: "createEffect",
          argumentCount: 1,
          syntax: "direct-call",
        },
        guidance:
          "Read the full callback, imports, and nearby reactive declarations. Explain the migration by default and edit only when explicitly asked. For the supported plain shape, move reactive reads into the compute callback, return their value, and keep the imperative operation in the effect callback. Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent. Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable.",
      };
    });

  return { rule: createEffectRule, findings };
}
