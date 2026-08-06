import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

export const onMountRule = {
  ruleId: "S2-LIFECYCLE-001",
  description:
    "Direct one-argument onMount calls bound to an exact named import from solid-js.",
};

export function analyzeOnMount(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = directOneArgumentOnMountCalls(rootNode).map((call) => {
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

function directOneArgumentOnMountCalls(
  rootNode: SgNode<TSX>,
): SgNode<TSX>[] {
  const calls = new Map<number, SgNode<TSX>>();

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== "solid-js") continue;

    for (const specifier of statement.findAll({
      rule: { kind: "import_specifier" },
    })) {
      if (specifier.text().trim() !== "onMount") continue;
      const identifiers = specifier.findAll({ rule: { kind: "identifier" } });
      const binding = identifiers[0];
      if (!binding || identifiers.length !== 1) continue;

      for (const fileReferences of binding.references()) {
        for (const reference of fileReferences.nodes) {
          let functionNode = reference;
          let call = reference.parent();
          while (call?.kind() === "parenthesized_expression") {
            functionNode = call;
            call = call.parent();
          }
          if (!call || call.kind() !== "call_expression") continue;
          if (call.field("function")?.id() !== functionNode.id()) continue;
          const argumentsNode = call.field("arguments");
          if (!argumentsNode) continue;
          const argumentsList = argumentsNode
            .children()
            .filter((child) => child.isNamed() && child.kind() !== "comment");
          if (argumentsList.length !== 1) continue;
          if (argumentsList[0]?.kind() === "spread_element") continue;
          calls.set(call.id(), call);
        }
      }
    }
  }

  return [...calls.values()];
}

function stringLiteralValue(node: SgNode<TSX>): string | null {
  const text = node.text();
  if (text.length < 2) return null;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return null;
  }
  return text.slice(1, -1);
}

function sourceExcerpt(source: string, startLineIndex: number, endLineIndex: number) {
  const lines = source.split(/\r?\n/);
  const first = Math.max(0, startLineIndex - 1);
  const last = Math.min(lines.length, Math.max(endLineIndex + 2, first + 1));
  return {
    startLine: first + 1,
    text: lines.slice(first, Math.min(last, first + 5)).join("\n"),
  };
}
