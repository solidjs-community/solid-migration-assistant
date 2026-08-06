import type { Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const LEGACY_WEB_MODULE = "solid-js/web";
const SOLID_2_WEB_MODULE = "@solidjs/web";

type StaticWebImport = {
  statement: SgNode<TSX>;
  source: SgNode<TSX>;
};

export const webImportRule = {
  ruleId: "S2-IMPORT-WEB-001",
  description: "Static ES imports whose module source is exactly solid-js/web.",
};

export function analyzeWebImport(
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) {
  const findings = findStaticWebImports(rootNode).map(({ source }) => {
    const range = source.range();
    const line = range.start.line + 1;
    const column = range.start.column + 1;
    return {
      id: `${webImportRule.ruleId}:${context.filename}:${line}:${column}`,
      ruleId: webImportRule.ruleId,
      title: "Move the Solid web renderer import",
      route: "safe-transform" as const,
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
        "Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.",
      evidence: {
        moduleSource: LEGACY_WEB_MODULE,
        syntax: "static-import",
      },
      guidance:
        "Run `pnpm transform --target .` to rewrite only this static import's module source while preserving its quote style.",
    };
  });

  return { rule: webImportRule, findings };
}

export function transformWebImport(rootNode: SgNode<TSX>): Edit[] {
  return findStaticWebImports(rootNode).map(({ source }) =>
    source.replace(replacementModuleLiteral(source)),
  );
}

function findStaticWebImports(rootNode: SgNode<TSX>): StaticWebImport[] {
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

function replacementModuleLiteral(source: SgNode<TSX>): string {
  const text = source.text();
  const quote = text.startsWith("'") ? "'" : '"';
  return `${quote}${SOLID_2_WEB_MODULE}${quote}`;
}

function stringLiteralValue(node: SgNode<TSX>): string | null {
  const text = node.text();
  if (text.length < 2) return null;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return null;
  }
  return text.slice(1, -1).replaceAll("\\/", "/");
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
