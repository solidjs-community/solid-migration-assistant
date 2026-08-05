import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

export const LEGACY_WEB_MODULE = "solid-js/web";
export const SOLID_2_WEB_MODULE = "@solidjs/web";

export type StaticWebImport = {
  statement: SgNode<TSX>;
  source: SgNode<TSX>;
};

export function findStaticWebImports(rootNode: SgNode<TSX>): StaticWebImport[] {
  const matches: StaticWebImport[] = [];

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== LEGACY_WEB_MODULE) continue;
    matches.push({ statement, source });
  }

  return matches;
}

export function replacementModuleLiteral(source: SgNode<TSX>): string {
  const text = source.text();
  const quote = text.startsWith("'") ? "'" : '"';
  return `${quote}${SOLID_2_WEB_MODULE}${quote}`;
}

export function stringLiteralValue(node: SgNode<TSX>): string | null {
  const text = node.text();
  if (text.length < 2) return null;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return null;
  }
  return text.slice(1, -1);
}
