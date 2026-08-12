import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

export const ANALYSIS_STATE_KEY = "solid-migration-assistant-guidance";

export type DirectImportedCall = {
  call: SgNode<TSX>;
  argumentNodes: SgNode<TSX>[];
  filename: string;
};

export function findImportedCalls(
  rootNode: SgNode<TSX>,
  moduleName: string,
  importedName: string,
): DirectImportedCall[] {
  const calls = new Map<string, DirectImportedCall>();

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== moduleName) continue;

    // ── Named imports (plain or aliased) ──
    for (const specifier of statement.findAll({
      rule: { kind: "import_specifier" },
    })) {
      const identifiers = specifier.findAll({ rule: { kind: "identifier" } });
      // Allow 1 id (plain) or 2 ids (aliased); first id is the imported name.
      if (identifiers.length < 1 || identifiers.length > 2) continue;
      if (identifiers[0]!.text().trim() !== importedName) continue;
      const binding = identifiers[identifiers.length - 1]!;

      for (const fileReferences of binding.references()) {
        const filename = fileReferences.root
          .relativeFilename()
          .replaceAll("\\", "/");
        for (const reference of fileReferences.nodes) {
          const resolved = resolveCallFromCallee(reference);
          if (!resolved) continue;
          const { call, argumentsNode } = resolved;
          const argumentNodes = argumentsNode
            .children()
            .filter((child) => child.isNamed() && child.kind() !== "comment");
          calls.set(`${filename}:${call.id()}`, {
            call,
            argumentNodes,
            filename,
          });
        }
      }
    }

    // ── Namespace imports (import * as X) ──
    for (const ns of statement.findAll({
      rule: { kind: "namespace_import" },
    })) {
      const binding = ns.findAll({ rule: { kind: "identifier" } })[0];
      if (!binding) continue;

      for (const fileReferences of binding.references()) {
        const filename = fileReferences.root
          .relativeFilename()
          .replaceAll("\\", "/");
        for (const ref of fileReferences.nodes) {
          // Walk up through parens to the member_expression whose object is ref
          let obj = ref;
          let member = ref.parent();
          while (member?.kind() === "parenthesized_expression") {
            obj = member;
            member = member.parent();
          }
          if (!member || member.kind() !== "member_expression") continue;
          if (member.field("object")?.id() !== obj.id()) continue;

          const prop = member.field("property");
          if (!prop) continue;
          if (prop.kind() === "property_identifier") {
            if (prop.text() !== importedName) continue;
          } else if (prop.kind() === "string") {
            if (stringLiteralValue(prop) !== importedName) continue;
          } else {
            continue; // computed property — unresolvable
          }

          const resolved = resolveCallFromCallee(member);
          if (!resolved) continue;
          const { call, argumentsNode } = resolved;
          const argumentNodes = argumentsNode
            .children()
            .filter((child) => child.isNamed() && child.kind() !== "comment");
          calls.set(`${filename}:${call.id()}`, {
            call,
            argumentNodes,
            filename,
          });
        }
      }
    }
  }

  return [...calls.values()];
}

/**
 * Given a node that should be the callee of a call, unwrap parenthesized
 * expressions and verify it is the function field of a call_expression.
 * Returns the call and its arguments node, or null if the node is not a
 * direct callee.
 */
function resolveCallFromCallee(
  node: SgNode<TSX>,
): { call: SgNode<TSX>; argumentsNode: SgNode<TSX> } | null {
  let functionNode = node;
  let call = node.parent();
  while (call?.kind() === "parenthesized_expression") {
    functionNode = call;
    call = call.parent();
  }
  if (!call || call.kind() !== "call_expression") return null;
  if (call.field("function")?.id() !== functionNode.id()) return null;
  const argumentsNode = call.field("arguments");
  if (!argumentsNode) return null;
  return { call, argumentsNode };
}

export function stringLiteralValue(node: SgNode<TSX>): string | null {
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
    if (escaped === "\n" || escaped === "\u2028" || escaped === "\u2029")
      continue;
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
