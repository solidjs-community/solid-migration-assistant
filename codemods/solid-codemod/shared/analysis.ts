import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

export type DirectImportedCall = {
  call: SgNode<TSX>;
  argumentNodes: SgNode<TSX>[];
};

export function findDirectImportedCalls(
  rootNode: SgNode<TSX>,
  moduleName: string,
  importedName: string,
): DirectImportedCall[] {
  const calls = new Map<number, DirectImportedCall>();

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== moduleName) continue;

    for (const specifier of statement.findAll({
      rule: { kind: "import_specifier" },
    })) {
      if (specifier.text().trim() !== importedName) continue;
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
          const argumentNodes = argumentsNode
            .children()
            .filter((child) => child.isNamed() && child.kind() !== "comment");
          calls.set(call.id(), { call, argumentNodes });
        }
      }
    }
  }

  return [...calls.values()];
}

export function sourceExcerpt(
  source: string,
  startLineIndex: number,
  endLineIndex: number,
) {
  const lines = source.split(/\r?\n/);
  const first = Math.max(0, startLineIndex - 1);
  const last = Math.min(lines.length, Math.max(endLineIndex + 2, first + 1));
  return {
    startLine: first + 1,
    text: lines.slice(first, Math.min(last, first + 5)).join("\n"),
  };
}

function stringLiteralValue(node: SgNode<TSX>): string | null {
  const text = node.text();
  if (text.length < 2) return null;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return null;
  }

  let value = "";
  const end = text.length - 1;
  for (let index = 1; index < end; index++) {
    const character = text[index]!;
    if (character !== "\\") {
      value += character;
      continue;
    }

    index++;
    if (index >= end) return null;
    const escaped = text[index]!;
    if (escaped === "\n" || escaped === "\u2028" || escaped === "\u2029") continue;
    if (escaped === "\r") {
      if (text[index + 1] === "\n") index++;
      continue;
    }

    const simpleEscapes: Record<string, string> = {
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
      v: "\v",
      "0": "\0",
    };
    if (escaped in simpleEscapes) {
      if (escaped === "0" && /[0-9]/.test(text[index + 1] ?? "")) return null;
      value += simpleEscapes[escaped]!;
      continue;
    }

    if (escaped === "x") {
      const digits = text.slice(index + 1, index + 3);
      if (!/^[0-9a-f]{2}$/i.test(digits)) return null;
      value += String.fromCharCode(Number.parseInt(digits, 16));
      index += 2;
      continue;
    }

    if (escaped === "u") {
      if (text[index + 1] === "{") {
        const close = text.indexOf("}", index + 2);
        if (close < 0 || close >= end) return null;
        const digits = text.slice(index + 2, close);
        if (!/^[0-9a-f]+$/i.test(digits)) return null;
        const codePoint = Number.parseInt(digits, 16);
        if (codePoint > 0x10ffff) return null;
        value += String.fromCodePoint(codePoint);
        index = close;
        continue;
      }
      const digits = text.slice(index + 1, index + 5);
      if (!/^[0-9a-f]{4}$/i.test(digits)) return null;
      value += String.fromCharCode(Number.parseInt(digits, 16));
      index += 4;
      continue;
    }

    value += escaped;
  }
  return value;
}
