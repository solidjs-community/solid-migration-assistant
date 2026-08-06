import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  sourceExcerpt,
} from "../../shared/analysis.ts";

export const createComputedRule = {
  ruleId: "S2-COMPUTED-001",
  description:
    "Direct createComputed calls bound to an exact named import from solid-js.",
};

export function analyzeCreateComputed(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = findDirectImportedCalls(rootNode, "solid-js", "createComputed").map(
    ({ call, argumentNodes }) => {
      const range = call.range();
      const line = range.start.line + 1;
      const column = range.start.column + 1;
      return {
        id: `${createComputedRule.ruleId}:${context.filename}:${line}:${column}`,
        ruleId: createComputedRule.ruleId,
        title: "Choose a Solid 2 replacement for createComputed",
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
          "Solid 2 removes createComputed; the correct replacement depends on whether the callback derives a value, performs an effect, or encodes stateful update logic.",
        evidence: {
          importedName: "createComputed",
          argumentCount: argumentNodes.length,
          hasSpreadArguments: argumentNodes.some(
            (argument) => argument.kind() === "spread_element",
          ),
          syntax: "direct-call",
        },
        guidance:
          "Read the complete callback, every use of values it reads or writes, and nearby ownership. Explain the migration by default and edit only when explicitly asked. Use createMemo only for a readonly derived value that callers consume. Use Solid 2's split createEffect when reactive inputs can be returned by a compute callback and imperative work belongs in a separate effect callback. Consider function-form createSignal state only when the callback is intentionally maintaining state rather than producing an effect. Stop without proposing a rewrite when the callback writes to reactive inputs, mixes several operations, registers cleanup, starts async work, contains intent-changing control flow, or has unclear ownership or consumers. Ask for the smallest focused test or runtime observation that distinguishes derivation, side effect, and stateful update behavior.",
      };
    },
  );

  return { rule: createComputedRule, findings };
}
